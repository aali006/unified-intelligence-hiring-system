import requests
import json
import re


OLLAMA_BASE_URL = "http://localhost:11434/api/generate"
MODEL = "mistral"  # Use the same model as used for fitment scoring


def call_fitment_llm(prompt: str) -> str:
    """Calls the local LLM with a structured prompt and returns raw text output."""
    try:
        response = requests.post(
            OLLAMA_BASE_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=300
        )
        json_data = response.json()
        response_data = json_data.get("response", "")
        return "".join(response_data) if isinstance(response_data, list) else response_data
    except Exception as e:
        print("❌ Fitment LLM call failed:", e)
        return ""


def build_prompt(jd_text: str, resume_text: str) -> str:
    """Builds a structured prompt for gap analysis."""
    return f"""
You are a hiring intelligence assistant.

Your job is to analyze a candidate's resume in the context of a job description (JD), and return a JSON object with the following structure:

{{
  "gap_analysis": {{
    "minor": ["skill1", "skill2"],
    "major": ["skill3", "skill4"]
  }},
  "suggestions": {{
    "resume_improvements": "Give 2-3 concrete suggestions to improve alignment with the JD. Reference missing tools, underexplored skills, or relevant experiences that could be emphasized.",
    "skills_to_add": ["skill1", "skill2"],
    "learning_resources": [
      {{
        "title": "Resource Title",
        "path": "/resources/local-guide.pdf"
      }}
    ]
  }}
}}

Guidelines:
- Do NOT place the same or similar skill in both minor and major gaps.
- Merge skill variants like:
  - "React.js (advanced)", "React.js basics" → "React.js"
  - "Redux or similar state management", "Basic knowledge of Redux" → "Redux"
  - "Familiarity with Figma" → "Figma"
- Only return skills that are missing or unclear from the resume.
- Lists should have 2–5 items max. Use empty string/list when not applicable.
- Output only valid JSON — no markdown, headers, or explanation.

JD:
{jd_text}

Resume:
{resume_text}
""".strip()


def extract_location_with_llm(text_segment: str) -> str:
    """Uses the LLM to extract only the city name from a resume snippet."""
    if not text_segment.strip():
        return ""

    prompt = f"""
You are a location extractor.

From the following resume text, extract only the **city name**. Do NOT return full addresses or countries.
If no city is found, return an empty string.

Text:
{text_segment}
""".strip()

    try:
        res = requests.post(
            OLLAMA_BASE_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=30
        )
        raw = res.json().get("response", "").strip()
        print("📍 Raw location model output:", raw)
        return raw.split(",")[0].split("\n")[0].strip()
    except Exception as e:
        print("❌ Location extraction failed:", e)
        return ""



def refine_skills_with_llm(skills_text: str) -> list:
    """
    Uses local LLM to turn raw skills text into a clean list of individual skills.
    """
    if not skills_text.strip():
        return []

    prompt = f"""
You are a resume parsing assistant.

Extract a clean JSON array of individual skill names from the following text. Avoid duplicates and remove phrases. Only list skill names in a JSON array.

Text:
{skills_text}
""".strip()

    try:
        res = requests.post(
            OLLAMA_BASE_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=60
        )
        raw = res.json().get("response", "").strip()
        print("🛠️ Raw skills model output:", raw)
        match = re.search(r"\[.*\]", raw, re.S)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print("❌ Skills LLM call failed:", e)

    return []
