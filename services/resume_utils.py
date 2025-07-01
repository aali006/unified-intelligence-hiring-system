import random
import string
import tempfile
from docx import Document
import pdfplumber
import io
import fitz  # PyMuPDF
import os
import spacy
import re

# Load spaCy model globally to avoid reloading on each call
nlp = spacy.load("en_core_web_sm")

def generate_candidate_id():
    return "CND-" + ''.join(random.choices(string.digits, k=4))

def generate_numeric_id():
    return int(''.join(random.choices(string.digits, k=4)))

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

def extract_email(text):
    matches = re.findall(r'\b[\w\.\+-]+@[\w\.-]+\.\w{2,}\b', text)
    return matches[0] if matches else ""

def extract_github(text):
    match = re.search(r'(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+(?!\/)', text)
    return match.group().replace("www.", "") if match else ""

def extract_phone(text):
    match = re.search(
        r'(?:\+91[\s-]*)?'
        r'(?:0)?'
        r'[\s-]*'
        r'('
        r'(?:[6-9]\d{9})'
        r'|(?:[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})'
        r'|(?:[6-9]\d{4}[\s-]?\d{5})'
        r')',
        text
    )
    if match:
        digits = re.sub(r'\D', '', match.group(1))
        return f"+91{digits}" if len(digits) == 10 else digits
    return ""

def clean_location_output(location_str):
    if not location_str:
        return ""
    if "empty string" in location_str.lower() or "no city" in location_str.lower():
        return ""
    return location_str.strip()

def extract_contact_block_for_location(resume_text):
    """
    Extracts lines around contact details, expands ±5 lines, stops at section headings, hard-cap at 10 lines.
    """
    lines = resume_text.split("\n")
    indicators = []
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        if "@" in line_lower or "linkedin.com" in line_lower or re.search(r'\+?\d[\d\s-]{7,}', line_lower):
            indicators.append(idx)

    if not indicators:
        return "\n".join(lines[:10])

    selected_lines = set()
    section_keywords = [
        "skills", "experience", "education", "achievements", "leadership",
        "projects", "profile", "objective", "summary", "certifications",
        "internship", "training", "professional summary"
    ]

    for idx in indicators:
        start = max(0, idx - 5)
        end = min(len(lines), idx + 6)
        for i in range(start, end):
            line_text = lines[i].strip().lower()
            if any(line_text.startswith(k) for k in section_keywords):
                print(f"🚨 Stopping contact block collection early at line {i}: '{lines[i]}'")
                combined_lines = [lines[j] for j in sorted(selected_lines)]
                if len(combined_lines) > 10:
                    combined_lines = combined_lines[:10]
                return "\n".join(combined_lines)
            selected_lines.add(i)

    combined_lines = [lines[i] for i in sorted(selected_lines)]
    if len(combined_lines) > 10:
        combined_lines = combined_lines[:10]

    keywords = ["based in", "currently in", "location", "lives in", "from", "residing", "city"]
    keyword_lines = [line for line in combined_lines if any(kw in line.lower() for kw in keywords)]

    if keyword_lines:
        return "\n".join(keyword_lines)
    else:
        return "\n".join(combined_lines)

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


def extract_location_with_spacy(contact_text):
    """
    Uses spaCy NER to extract a probable city/location from contact info block.
    Prioritizes first GPE entity (Geo-Political Entity).
    """
    doc = nlp(contact_text)
    for ent in doc.ents:
        if ent.label_ == "GPE":
            print(f"🏙️ Found location with spaCy: {ent.text}")
            return ent.text.strip()
    print("⚠️ No location detected with spaCy.")
    return ""