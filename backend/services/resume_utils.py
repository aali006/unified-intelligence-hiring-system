import json
import random
import string
import tempfile
from docx import Document
import pdfplumber
import io
import fitz  # PyMuPDF
import os
import re
from services.ollama_utils import call_fitment_llm


def generate_numeric_id():
    return int(''.join(random.choices(string.digits, k=4)))

def extract_context_lines(text, match):
    """
    Given full text and a regex match object, returns up to one line above and below the matched line.
    """
    lines = text.splitlines()
    match_line_idx = None
    for i, line in enumerate(lines):
        if match.group() in line:
            match_line_idx = i
            break
    if match_line_idx is None:
        return ""
    start = max(0, match_line_idx - 1)
    end = min(len(lines), match_line_idx + 2)
    context = "\n".join(lines[start:end]).strip()
    return context

def extract_text_from_resume(file_bytes, filename):
    if filename.endswith(".pdf"):
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join([page.extract_text() or "" for page in pdf.pages])
            if len(text.strip()) >= 100:
                return text
            else:
                raise ValueError("Too little text from pdfplumber")
        except Exception as e:
            print("⚠️ PDFPlumber failed, falling back to fitz:", e)
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                return "".join([page.get_text() for page in doc])
    elif filename.endswith(".docx"):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        doc = Document(tmp_path)
        os.remove(tmp_path)
        return "\n".join([para.text for para in doc.paragraphs])
    else:
        return ""

# ✅ Unified contact extraction
def extract_all_contact_metadata_from_context(text: str) -> dict:
    from services.ollama_utils import call_fitment_llm
    import json
    from collections import OrderedDict

    def extract_context_lines(text, match):
        lines = text.splitlines()
        match_line_idx = None
        for i, line in enumerate(lines):
            if match and match.group() in line:
                match_line_idx = i
                break
        if match_line_idx is None:
            return ""
        start = max(0, match_line_idx - 1)
        end = min(len(lines), match_line_idx + 2)
        return "\n".join(lines[start:end]).strip()

    # Regex matches
    email_match = re.search(r'\b[\w\.\+-]+@[\w\.-]+\.\w{2,}\b', text)
    phone_match = re.search(
        r'(?:\+91[\s-]*)?(?:0)?[\s-]*((?:[6-9]\d{9})|(?:[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})|(?:[6-9]\d{4}[\s-]?\d{5}))',
        text
    )
    github_match = re.search(r'(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+(?!\/)', text)

    # Context extraction
    email_context = extract_context_lines(text, email_match) if email_match else ""
    phone_context = extract_context_lines(text, phone_match) if phone_match else ""
    github_context = extract_context_lines(text, github_match) if github_match else ""

    # Location context from contact block
    def extract_contact_block_for_location(resume_text):
        lines = resume_text.split("\n")
        indicators = []
        for idx, line in enumerate(lines):
            line_lower = line.lower()
            if "@" in line_lower or "linkedin.com" in line_lower or re.search(r'\+?\d[\d\s-]{7,}', line_lower):
                indicators.append(idx)
        if not indicators:
            return "\n".join(lines[:10])
        selected_lines = set()
        section_keywords = ["skills", "experience", "education", "projects", "certifications", "summary"]
        for idx in indicators:
            for i in range(max(0, idx - 5), min(len(lines), idx + 6)):
                if any(lines[i].strip().lower().startswith(k) for k in section_keywords):
                    break
                selected_lines.add(i)
        combined_lines = [lines[i] for i in sorted(selected_lines)]
        return "\n".join(combined_lines[:10]) if combined_lines else ""

    location_context = extract_contact_block_for_location(text)

    # Combine and deduplicate
    raw_lines = "\n".join(filter(None, [
        email_context,
        phone_context,
        github_context,
        location_context
    ])).splitlines()
    unique_lines = list(OrderedDict.fromkeys([line.strip() for line in raw_lines if line.strip()]))
    combined_context = "\n".join(unique_lines[:15])  # Cap at 15 clean lines

    print("🧠 Extracted Contact Context Being Sent to LLM:\n", combined_context[:2000])

    # Updated prompt
    prompt = f"""
You are an expert at reading resumes and extracting structured metadata.

Extract the following data of the candidate if identifiable from the text:
- email
- phone number
- GitHub profile URL
- location (city-level only)

If something is not explicitly present, leave it as an empty string.

Resumes often list these details in the first few lines or together.

Return only a valid JSON object in this format:
{{
  "email": "",
  "phone": "",
  "github": "",
  "location": ""
}}

Resume Contact Context:
\"\"\"
{combined_context}
\"\"\"
""".strip()

    try:
        raw = call_fitment_llm(prompt, max_tokens=100)
        print("🧾 Raw LLM response:\n", raw.strip()[:1000])
        json_match = re.search(r"\{[\s\S]*?\}", raw)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print("❌ Failed to parse LLM metadata output:", e)

    return {"email": "", "phone": "", "github": "", "location": ""}

def normalize_text(text):
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def build_sections(text, headings):
    sections = {}
    for i, (start_idx, heading) in enumerate(headings):
        heading_lower = heading.lower()
        end_idx = headings[i + 1][0] if i + 1 < len(headings) else len(text)
        section_text = text[start_idx:end_idx].strip()
        sections[heading_lower] = section_text
    return sections

def find_all_headings(text):
    lines = text.splitlines()
    headings = []
    heading_pattern = (
        r'^('
        r'(?:'
        r'(?:[A-Z][A-Z]+|[A-Z][a-z]+)'
        r'(?:\s+(?:[A-Z][A-Z]+|[A-Z][a-z]+|and|or|of|&)){0,10}'
        r')'
        r')[\s_]*:?\s*$'
    )

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(heading_pattern, stripped):
            if re.match(r'^[A-Za-z]+[;.,]$', stripped):
                continue
            if i > 0 and lines[i - 1].strip().endswith(","):
                continue
            start_idx = text.find(line)
            headings.append((start_idx, stripped))
    return headings

def force_newlines_before_headings(text):
    return re.sub(
        r'(^|\n)(\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,5}\s*:?\s*\n|[A-Z &/().-]{5,}\s*\n)',
        r'\1\2\n\3',
        text
    )

def extract_skills_section(text):
    text = normalize_text(text)
    headings = find_all_headings(text)
    sections = build_sections(text, headings)
    for key in sections:
        if any(skill_kw in key for skill_kw in [
            "skills", "technical skills", "soft skills", "key skills", "technologies",
            "languages", "frameworks", "tools", "competencies"
        ]):
            print(f"✅ Found skills section: '{key}'")
            return sections[key]
    print("⚠️ No skills section found.")
    return ""

def extract_skills_with_llm(resume_text):
    """
    Calls LLM to extract explicit skills from skills/work sections,
    and highest education level + degree separately.
    """
    prompt = f"""
You are a resume parsing assistant.

Task:
- From the resume text below:
  - Extract all technical and non-technical skills the candidate explicitly mentions in skills sections or work experience/project descriptions.
  - Do NOT include skills implied from education degrees alone if unrelated.
  - Additionally, identify the candidate's highest education, returning:
    - education level (e.g., High School, Undergraduate, Graduate, Master’s, PhD).
    - degree/major title (e.g., B.Tech in Mechanical Engineering).

Return only a valid JSON object with two keys:
- "skills": an array of unique skills.
- "education": an object with keys "level" and "degree".

Do not include explanations, markdown, or any text outside the JSON.

=== START RESUME ===
{resume_text}
=== END RESUME ===

Now respond below with ONLY the JSON object:
""".strip()

    raw = call_fitment_llm(prompt)
    try:
        json_match = re.search(r"\{[\s\S]*\}", raw)
        if json_match:
            parsed = json.loads(json_match.group())
            skills = sorted(list(set(parsed.get("skills", [])))) if isinstance(parsed.get("skills"), list) else []
            education = parsed.get("education", {})
            if not isinstance(education, dict):
                education = {"level": "", "degree": ""}
            return {
                "skills": skills,
                "education": {
                    "level": education.get("level", ""),
                    "degree": education.get("degree", "")
                }
            }
    except Exception as e:
        print("❌ Failed to parse skills + education JSON:", e)
    return {
        "skills": [],
        "education": {"level": "", "degree": ""}
    }
