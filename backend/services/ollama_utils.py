import requests
import json
import re
import httpx

# OLLAMA_BASE_URL = "https://1f57bff129d4.ngrok-free.app/generate"
OLLAMA_BASE_URL = "http://localhost:11434/api/generate"

#MODEL = "mistral"  # Local LLM for fitment scoring
# MODEL = 'llama3.2'

# MODEL = 'llama3.1:8b-instruct-q2_K'
MODEL = 'llama3.2:1b'

# def call_fitment_llm(prompt: str, max_tokens: int = 1000) -> str:
#     """Calls local Ollama LLM via /generate and returns the raw text response."""
#     try:
#         response = requests.post(
#             OLLAMA_BASE_URL,
#             json={
#                 "model": MODEL,
#                 "prompt": prompt,
#                 "max_tokens": max_tokens,  # <-- control here
#                 "stream": False
#             },
#             timeout=300
#         )
#         json_data = response.json()
#         raw_response = json_data.get("response", "")
#         return raw_response
#     except Exception as e:
#         print("❌ Fitment LLM call failed:", e)
#         return ""

# def call_fitment_llm(prompt: str, max_tokens: int = 1000) -> str:
#     try:
#         response = requests.post(
#             OLLAMA_BASE_URL,
#             json={
#                 "model": MODEL,
#                 "prompt": prompt,
#                 "stream": False, # Crucial: makes Ollama wait until finished
#                 "options": {
#                     "num_predict": max_tokens
#                 }
#             },
#             timeout=120 # Give the AI time to think
#         )
        
#         # Check if the request actually worked
#         if response.status_code != 200:
#             print(f"❌ Ollama returned error: {response.status_code}")
#             return ""

#         json_data = response.json()
#         return json_data.get("response", "")
#     except Exception as e:
#         print("❌ Fitment LLM call failed:", e)
#         return ""

# def build_prompt(jd_text: str, resume_text: str) -> str:
#     """Builds a structured prompt with explicit delimiters and context-aware matching."""
#     return f"""
# You are a hiring intelligence assistant.

# Task:
# 1. Compare the candidate's resume with the job description (JD).
# 2. Treat skills mentioned not only in the 'Skills' section, but also in 'Projects', 'Work Experience', or 'Positions of Responsibility' as valid evidence of the candidate possessing those skills.
# 3. Identify any missing or unclear skills that are genuinely not supported anywhere in the resume.
# 4. Suggest resume improvements, clearly indicating the specific project, role, or section where the improvement should be made.
# 5. Suggest new skills to learn and relevant learning resources.
# 6. Identify the matched skills — i.e., skills already present in the resume that match the JD.

# Output Rules:
# - If a skill is already mentioned anywhere in the resume (skills, projects, roles, certifications, or positions), do NOT list it as a gap.
# - Suggestions should be context-aware. For example: "Mention React.js experience explicitly in the 'Edumate Project' description" rather than a generic "Add React.js".
# - Return ONLY a valid JSON object with these keys:
#   - "gap_analysis": {{"minor": [...], "major": [...]}}
#   - "suggestions": {{
#         "resume_improvements": (string),
#         "skills_to_add": (list),
#         "learning_resources": (list of objects: {{"skill": str, "resource": str}})
#     }}
#   - "matched_skills": (list)

# Do not include explanations, markdown, or any extra text outside the JSON.

# === START JD ===
# {jd_text}
# === END JD ===

# === START RESUME ===
# {resume_text}
# === END RESUME ===

# Now respond below with ONLY the JSON object:
# """.strip()

# def call_fitment_llm(prompt: str, max_tokens: int = 1500) -> str:
#     try:
#         response = requests.post(
#             OLLAMA_BASE_URL,
#             json={
#                 "model": MODEL,
#                 "prompt": prompt,
#                 "stream": False,
#                 "options": {
#                     "num_predict": max_tokens,
#                     "temperature": 0.0,      # Absolute consistency
#                     "seed": 42,               # Math lock
#                     "num_ctx": 8192,          # CRITICAL: Increases memory so it doesn't "forget" PyTorch
#                     "top_k": 1,               # Forces only the #1 most likely word
#                     "top_p": 0.0
#                 }
#             },
#             timeout=300
#         )
        
#         if response.status_code != 200:
#             return ""

#         json_data = response.json()
#         raw_output = json_data.get("response", "").strip()
#         raw_output = re.sub(r'^```json\s*|\s*```$', '', raw_output, flags=re.MULTILINE)
#         return raw_output

#     except Exception as e:
#         print("❌ Fitment LLM call failed:", e)
#         return ""

import httpx # Make sure to pip install httpx

# async def call_fitment_llm(prompt: str, max_tokens: int = 1500) -> str:
#     try:
#         # Using AsyncClient prevents the "frozen" UI/Database feeling
#         async with httpx.AsyncClient(timeout=300.0) as client:
#             response = await client.post(
#                 OLLAMA_BASE_URL,
#                 json={
#                     "model": MODEL,
#                     "prompt": prompt,
#                     "stream": False,
#                     "options": {
#                         "num_predict": max_tokens,
#                         "temperature": 0.0,
#                         "num_ctx": 4096, # Reduced from 8192 for 1B model speed
#                     }
#                 }
#             )
        
#         if response.status_code != 200:
#             return ""

#         json_data = response.json()
#         raw_output = json_data.get("response", "").strip()
#         # Cleans the JSON from any markdown clutter
#         raw_output = re.sub(r'^```json\s*|\s*```$', '', raw_output, flags=re.MULTILINE)
#         return raw_output

#     except Exception as e:
#         print("❌ Fitment LLM call failed:", e)
#         return ""

def call_fitment_llm(prompt: str, max_tokens: int = 1500):

    try:
        response = requests.post(
            OLLAMA_BASE_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.0,
                    "num_ctx": 4096
                }
            },
            timeout=300
        )

        if response.status_code != 200:
            print("❌ Ollama returned:", response.status_code)
            return None

        data = response.json()
        raw_output = data.get("response", "").strip()

        raw_output = re.sub(r'^```json\s*|\s*```$', '', raw_output)

        return json.loads(raw_output)

    except Exception as e:
        print("❌ LLM call failed:", e)
        return None
    
def build_prompt(jd_text: str, resume_text: str) -> str:
    return f"""
[ROLE: SKEPTICAL TECHNICAL AUDITOR]
Your goal is to extract skills with 100% accuracy. 

STRICT RULES:
1. MATCHED_SKILLS: ONLY include a skill if it is EXPLICITLY written in the Resume. 
2. NO GUESSING: If 'Python' is not in the resume text, do NOT list it as a match, even if the candidate seems technical.
3. CASE SENSITIVITY: Treat 'PyTorch', 'pytorch', and 'PT' as the same skill.
4. GAPS: If a skill is in the JD but NOT the Resume, it is a Major or Minor Gap.

=== JOB DESCRIPTION ===
{jd_text}

=== CANDIDATE RESUME ===
{resume_text}

Return ONLY valid JSON:
{{
  "matched_skills": [],
  "gap_analysis": {{ "minor": [], "major": [] }},
  "suggestions": {{ 
      "resume_improvements": "Actionable advice", 
      "skills_to_add": [], 
      "learning_resources": [{{ "skill": "name", "resource": "link/platform" }}] 
  }}
}}
""".strip()

def build_aggregator_prompt(average_scores, combined_comments):
    """Constructs a clear, structured prompt with explicit delimiters for reliable raw LLM output."""
    return f"""
You are an interview feedback aggregator AI.

Task:
- Review the candidate's average interview scores and combined comments.
- Determine an overall verdict: Strong Hire, Hire, or No Hire.
- Identify key strengths and weaknesses based on the scores and comments.

Return only a valid JSON object with the keys: "verdict", "strengths", and "weaknesses".

Do not include explanations, markdown, or any text outside the JSON.

=== END OF INSTRUCTIONS ===

=== START SCORES ===
Communication: {average_scores['communication']}
Problem Solving: {average_scores['problem_solving']}
Domain Knowledge: {average_scores['domain_knowledge']}
Overall Average: {average_scores['overall_average']}
=== END SCORES ===

=== START COMMENTS ===
{combined_comments}
=== END COMMENTS ===

Now respond below with ONLY the JSON object:
""".strip()
