import requests
import json
import re

OLLAMA_BASE_URL = "https://1f57bff129d4.ngrok-free.app/generate"

MODEL = "mistral"  # Local LLM for fitment scoring

def call_fitment_llm(prompt: str, max_tokens: int = 100) -> str:
    """Calls local Ollama LLM via /generate and returns the raw text response."""
    try:
        response = requests.post(
            OLLAMA_BASE_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "max_tokens": max_tokens,  # <-- control here
                "stream": False
            },
            timeout=300
        )
        json_data = response.json()
        raw_response = json_data.get("response", "")
        return raw_response
    except Exception as e:
        print("❌ Fitment LLM call failed:", e)
        return ""

def build_prompt(jd_text: str, resume_text: str) -> str:
    """Builds a structured prompt with explicit delimiters and context-aware matching."""
    return f"""
You are a hiring intelligence assistant.

Task:
1. Compare the candidate's resume with the job description (JD).
2. Treat skills mentioned not only in the 'Skills' section, but also in 'Projects', 'Work Experience', or 'Positions of Responsibility' as valid evidence of the candidate possessing those skills.
3. Identify any missing or unclear skills that are genuinely not supported anywhere in the resume.
4. Suggest resume improvements, clearly indicating the specific project, role, or section where the improvement should be made.
5. Suggest new skills to learn and relevant learning resources.
6. Identify the matched skills — i.e., skills already present in the resume that match the JD.

Output Rules:
- If a skill is already mentioned anywhere in the resume (skills, projects, roles, certifications, or positions), do NOT list it as a gap.
- Suggestions should be context-aware. For example: "Mention React.js experience explicitly in the 'Edumate Project' description" rather than a generic "Add React.js".
- Return ONLY a valid JSON object with these keys:
  - "gap_analysis": {{"minor": [...], "major": [...]}}
  - "suggestions": {{
        "resume_improvements": (string),
        "skills_to_add": (list),
        "learning_resources": (list of objects: {{"skill": str, "resource": str}})
    }}
  - "matched_skills": (list)

Do not include explanations, markdown, or any extra text outside the JSON.

=== START JD ===
{jd_text}
=== END JD ===

=== START RESUME ===
{resume_text}
=== END RESUME ===

Now respond below with ONLY the JSON object:
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
