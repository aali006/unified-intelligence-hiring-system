import requests
import json
import re

OLLAMA_BASE_URL = "https://6550f83a1e3f.ngrok-free.app/generate"

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
    """Builds a structured prompt with explicit delimiters for reliable raw LLM output."""
    return f"""
You are a smart hiring intelligence assistant.

Task:
1. Compare the candidate's resume with the provided job description (JD).
2. Identify missing or unclear skills relevant to the JD.
3. Suggest resume improvements, new skills to learn, and useful learning resources.
4. Also identify the matched skills — skills the candidate already has that are relevant to the JD.

Return only a valid JSON object with these top-level keys:
- "gap_analysis" → with keys "minor" and "major" (both lists of missing skills)
- "suggestions" → with keys:
    - "resume_improvements" (string)
    - "skills_to_add" (list)
    - "learning_resources" (list)
- "matched_skills" (list of relevant skills the candidate already has)

Do not include explanations, markdown, or any text outside the JSON.

=== END OF INSTRUCTIONS ===

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
