from datetime import datetime
from services.mongo_service import candidates_collection, roles_collection
from services.qdrant_service import client, RESUME_COLLECTION, JD_COLLECTION
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from services.resume_segmenter import split_resume_into_chunks
from services.ollama_utils import call_fitment_llm, build_prompt
import numpy as np
import time
import json
import re
import torch 

# Fast and small model for chunk scoring
device = "cuda" if torch.cuda.is_available() else "cpu"
# model = SentenceTransformer("BAAI/bge-small-en-v1.5", device=device)
model = SentenceTransformer("all-MiniLM-L6-v2", device=device)

def score_fitment_logic(candidate_id: str):

    print(f"🔍 Input candidate_id: {candidate_id}")

    candidate = candidates_collection.find_one({"candidate_id": candidate_id})
    if not candidate:
        print("❌ Candidate not found in MongoDB.")
        return None

    # IMPORTANT: Disable caching during debugging
    # if "results" in candidate:
    #     return candidate["results"]

    role_id = candidate["applied_role_id"]
    resume_id = int(candidate_id.replace("CND-", ""))

    print(f"✅ Candidate: {candidate['name']}")
    print(f"🔧 Resume ID: {resume_id}, Role ID: {role_id}")

    resume_vector = get_vector_by_id(RESUME_COLLECTION, resume_id)
    jd_vector = get_vector_by_id(JD_COLLECTION, int(role_id))

    if resume_vector is None or jd_vector is None:
        print("❌ One or both vectors missing from Qdrant.")
        return None

    print("✅ Vectors found – computing similarity...")

    sim_score = compute_cosine_similarity(resume_vector, jd_vector)

    fitment_percent = round((sim_score * 1.3 + 0.15) * 100, 2)
    fitment_percent = min(fitment_percent, 100.0)

    jd_doc = roles_collection.find_one({"role_id": role_id})

    if not jd_doc:
        print("❌ JD not found in MongoDB.")
        return None

    jd_text = jd_doc["job_description"]
    resume_text = candidate["resume_text"]

    print("✅ Calling LLM for fitment analysis...")

    start = time.time()

    focused_resume = extract_top_relevant_chunks(jd_text, resume_text)

    llm_analysis = get_cleaned_fitment_analysis(jd_text, focused_resume)

    print("⏱️ LLM analysis took", round(time.time() - start, 2), "seconds")

    result = {
        "candidate_id": candidate_id,
        "applied_role_id": role_id,
        "fitment_score": fitment_percent,
        "semantic_similarity": round(sim_score, 4),
        **llm_analysis
    }

    # Save result
    result_to_store = result.copy()
    result_to_store["scored_at"] = datetime.now()

    candidates_collection.update_one(
        {"candidate_id": candidate_id},
        {"$set": {"results": result_to_store}}
    )

    return result

    # except Exception as e:
    #     print("❌ Error in score_fitment_logic:", e)
    #     return None
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e

# def get_vector_by_id(collection, id):
#     result = client.retrieve(
#         collection_name=collection,
#         ids=[id],
#         with_vectors=True
#     )
#     if result and result[0].vector:
#         return np.array(result[0].vector).reshape(1, -1)
#     return None
def get_vector_by_id(collection, id):

    result = client.retrieve(
        collection_name=collection,
        ids=[id],
        with_vectors=True
    )

    if result and len(result) > 0 and result[0].vector:
        return np.array(result[0].vector).reshape(1, -1)

    print("❌ Vector NOT found for id:", id)
    return None

def compute_cosine_similarity(v1, v2):
    return float(cosine_similarity(v1, v2)[0][0])

def extract_top_relevant_chunks(jd_text, resume_text, min_percent=0.50, min_coverage_chars=1500):
    """
    Selects the most relevant chunks from the resume for LLM analysis.
    Uses semantic similarity + JD keyword overlap boosting.
    Expanded slightly to capture project/PoR mentions without major latency increase.
    """
    jd_vector = model.encode(jd_text).reshape(1, -1)
    resume_chunks = split_resume_into_chunks(resume_text)

    jd_keywords = set([w.lower() for w in jd_text.split() if len(w) > 2])

    chunk_scores = []
    for i, chunk in enumerate(resume_chunks):
        chunk_vec = model.encode(chunk).reshape(1, -1)
        score = compute_cosine_similarity(chunk_vec, jd_vector)

        keyword_overlap = sum(1 for word in jd_keywords if word in chunk.lower())
        bonus = 0.05 * min(keyword_overlap, 4)  # allow slightly more bonus
        boosted_score = min(score + bonus, 1.0)

        print(f"Chunk {i+1} | Score: {round(score, 4)} | Bonus: {round(bonus, 3)} | Length: {len(chunk)}")
        chunk_scores.append((chunk, boosted_score))

    top_chunks = sorted(chunk_scores, key=lambda x: x[1], reverse=True)

    total_resume_chars = len(resume_text)
    threshold_chars = max(min_coverage_chars, int(total_resume_chars * min_percent))

    selected = []
    accumulated = 0
    for chunk, _ in top_chunks:
        selected.append(chunk)
        accumulated += len(chunk)
        if accumulated >= threshold_chars or len(selected) >= 12:  # bumped to 8 chunks
            break

    print(f"✅ Selected {len(selected)} chunks (~{accumulated} chars) with JD keyword boosting")
    return "\n\n".join(selected)

def get_cleaned_fitment_analysis(jd_text, resume_text):

    prompt = build_prompt(jd_text, resume_text)

    raw_output = call_fitment_llm(prompt, max_tokens=1000)

    if not raw_output:
        print("⚠️ LLM returned empty output")
        return empty_fitment_output()

    print("🧠 Raw LLM output preview:", str(raw_output)[:500])

    parsed = None

    # Case 1: LLM returned dict
    if isinstance(raw_output, dict):
        parsed = raw_output

    # Case 2: LLM returned string containing JSON
    elif isinstance(raw_output, str):

        try:
            json_match = re.search(r"\{[\s\S]*\}", raw_output)

            if json_match:
                parsed = json.loads(json_match.group())

        except Exception as e:
            print("❌ JSON parsing failed:", e)

    if not parsed:
        print("⚠️ Could not extract JSON from LLM output")
        return empty_fitment_output()

    return clean_llm_gap_output(parsed)

def clean_llm_gap_output(raw_output):
    def canonicalize(skill):
        # Normalizes strings for accurate comparison
        return (
            str(skill).strip()
            .lower()
            .replace(" or similar", "")
            .replace("basic knowledge of", "")
            .replace("familiarity with", "")
            .replace("understanding of", "")
            .replace("experience in", "")
            .replace("advanced", "")
            .replace("basics", "")
            .replace("(", "")
            .replace(")", "")
            .strip()
        )

    def dedup_skills(skill_list):
        if not isinstance(skill_list, list):
            return []
        seen = set()
        cleaned = []
        for skill in skill_list:
            canon = canonicalize(skill)
            if canon and canon not in seen:
                seen.add(canon)
                cleaned.append(skill)
        return sorted(cleaned)

    # 1. Validation & Extraction
    if not raw_output or not isinstance(raw_output, dict):
        return empty_fitment_output()

    matched_skills = dedup_skills(raw_output.get("matched_skills", []))
    gap_analysis = raw_output.get("gap_analysis", {})
    suggestions = raw_output.get("suggestions", {})

    # 2. CROSS-LIST DEDUPLICATION (The Fix for Overlaps)
    # Create a set of skills we ALREADY have in the resume
    matched_canons = {canonicalize(s) for s in matched_skills}

    # Filter Minor Gaps: Must not be in Matched
    minor_raw = dedup_skills(gap_analysis.get("minor", []))
    minor_clean = [s for s in minor_raw if canonicalize(s) not in matched_canons]

    # Filter Major Gaps: Must not be in Matched AND must not be in Minor
    major_raw = dedup_skills(gap_analysis.get("major", []))
    minor_canons = {canonicalize(s) for s in minor_clean}
    
    major_clean = [
        s for s in major_raw 
        if canonicalize(s) not in matched_canons 
        and canonicalize(s) not in minor_canons
    ]

    # 3. FALLBACK FOR IRRELEVANT CANDIDATES
    # If it's a 0% match and no gaps were found, the AI failed. Force a message.
    if not matched_skills and not major_clean:
        major_clean = ["Core Technical Stack (No overlap found)"]

    # 4. SUGGESTION SAFETY NET (The Fix for empty suggestions)
    resume_improvements = suggestions.get("resume_improvements", "")
    if isinstance(resume_improvements, list):
        resume_improvements = " ".join(resume_improvements)
    
    # If AI is lazy, generate a context-aware improvement
    if not str(resume_improvements).strip():
        if len(matched_skills) > 3:
            resume_improvements = f"Strong foundation in {', '.join(matched_skills[:2])}. Focus on quantifying your impact with metrics (e.g., '% improvement')."
        else:
            resume_improvements = "Tailor your resume by adding a 'Technical Skills' section that explicitly lists the keywords found in the JD."

    skills_to_add = dedup_skills(suggestions.get("skills_to_add", []))
    if not skills_to_add:
        # Use Major Gaps as a fallback for skills to add
        skills_to_add = major_clean[:3] if major_clean else ["Relevant Industry Certifications"]

    learning_resources = suggestions.get("learning_resources", [])
    if not isinstance(learning_resources, list) or not learning_resources:
        learning_resources = [{"skill": "Core JD Stack", "resource": "Search Coursera/edX for foundational certifications"}]

    return {
        "gap_analysis": {
            "minor": minor_clean,
            "major": major_clean
        },
        "suggestions": {
            "resume_improvements": str(resume_improvements).strip(),
            "skills_to_add": skills_to_add,
            "learning_resources": learning_resources
        },
        "matched_skills": matched_skills
    }
def empty_fitment_output():
    return {
        "gap_analysis": {"minor": [], "major": []},
        "suggestions": {
            "resume_improvements": "",
            "skills_to_add": [],
            "learning_resources": []
        },
        "matched_skills": []
    }



