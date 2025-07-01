import requests
import json
import re

OLLAMA_BASE_URL = "http://localhost:11434/api/generate"
MODEL = "mistral"  # Local LLM for fitment scoring

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
    """Builds a structured prompt for gap analysis with minimal ambiguity and no confusing examples."""
    return f"""
You are a smart hiring intelligence assistant.

Your task is to analyze a candidate's resume in the context of a job description (JD) and return a JSON object with the following structure:

{{
  "gap_analysis": {{
    "minor": [List of missing minor skills relevant to the JD],
    "major": [List of missing major skills relevant to the JD]
  }},
  "suggestions": {{
    "resume_improvements": "Give 2-3 concrete suggestions to improve alignment with the JD. Reference missing tools, underexplored skills, or relevant experiences that could be emphasized.",
    "skills_to_add": [List of suggested additional skills to learn],
    "learning_resources": [
      {{
        "title": "Resource Title",
        "path": "/resources/local-guide.pdf"
      }}
    ]
  }}
}}

Guidelines:
- Avoid hallucinating missing skills if they are already mentioned with similar terms in the resume. For example, if the resume mentions 'Generative AI', do not report 'Generative AI tools' as missing.
- Group related or synonymous skills and avoid listing redundant gaps.
- Only include skills or tools truly absent or unclear in the resume.
- Keep lists between 2–5 items when applicable; use empty lists if there are no gaps.
- Return valid JSON only — no markdown, no headers, no explanations outside the JSON.

JD:
{jd_text}

Resume:
{resume_text}
""".strip()
