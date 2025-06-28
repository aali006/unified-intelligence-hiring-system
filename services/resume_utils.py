import random
import string
import tempfile
from docx import Document
import pdfplumber
import io
import fitz  # PyMuPDF
import os
import re

def generate_candidate_id():
    return "CND-" + ''.join(random.choices(string.digits, k=4))

def generate_numeric_id():
    return int(''.join(random.choices(string.digits, k=4)))

def extract_text_from_resume(file_bytes, filename):
    if filename.endswith(".pdf"):
        # Try with pdfplumber first
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
    """
    Extracts Indian mobile numbers in multiple common formats:
    - +91 optional
    - optional leading zero
    - supports splits: 3-3-4, 5-5, continuous 10
    - separators: space, dash, or none
    """
    match = re.search(
        r'(?:\+91[\s-]*)?'       # optional +91
        r'(?:0)?'                # optional 0
        r'[\s-]*'                # optional space/hyphen
        r'('
        r'(?:[6-9]\d{9})'            # continuous 10 digits
        r'|(?:[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})'  # 3-3-4 split
        r'|(?:[6-9]\d{4}[\s-]?\d{5})'             # 5-5 split
        r')',
        text
    )
    if match:
        digits = re.sub(r'\D', '', match.group(1))  # remove non-digit chars
        return f"+91{digits}" if len(digits) == 10 else digits
    return ""



def extract_location_segment(text):
    lines = text.split("\n")
    keywords = ["based in", "currently in", "location", "from", "lives in"]
    context_lines = []

    for i, line in enumerate(lines):
        if any(kw in line.lower() for kw in keywords):
            start = max(0, i - 1)
            end = min(len(lines), i + 2)
            context_lines.append("\n".join(lines[start:end]))

    return "\n\n".join(context_lines[:3]) if context_lines else ""


def clean_location_output(location_str):
    """
    Cleans LLM location response: if the model politely says no city found, returns empty string.
    """
    if not location_str:
        return ""
    if "empty string" in location_str.lower() or "no city" in location_str.lower():
        return ""
    return location_str.strip()



def normalize_text(text):
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def build_sections(text, headings):
    """
    Builds a dict mapping section name (lowercase) -> section text,
    based on heading positions.
    """
    sections = {}
    for i, (start_idx, heading) in enumerate(headings):
        heading_lower = heading.lower()
        end_idx = headings[i + 1][0] if i + 1 < len(headings) else len(text)
        section_text = text[start_idx:end_idx].strip()
        sections[heading_lower] = section_text
    return sections


def find_all_headings(text):
    """
    Finds section headings that may contain:
    - multiple ALL CAPS words,
    - optional lowercase words like 'and', 'of', 'or', '&',
    - mixed uppercase/title-case blocks.
    Skips:
    - headings if the previous line ends with a comma (continuation line).
    - suspicious one-word headings with punctuation like ';' or '.' at the end.
    """
    lines = text.splitlines()
    headings = []

    heading_pattern = (
        r'^('
        r'(?:'
        r'(?:[A-Z][A-Z]+|[A-Z][a-z]+)'  # ALL CAPS words or Title Case words
        r'(?:\s+(?:[A-Z][A-Z]+|[A-Z][a-z]+|and|or|of|&)){0,10}'  # allow connectors
        r')'
        r')[\s_]*:?\s*$'  # ✅ allow trailing spaces/underscores, optional colon, end of line
    )

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check for match to your heading pattern
        if re.match(heading_pattern, stripped):
            # Skip suspicious single-word headings with punctuation
            if re.match(r'^[A-Za-z]+[;.,]$', stripped):
                continue

            # Skip headings if previous line ends with a comma
            if i > 0 and lines[i - 1].strip().endswith(","):
                continue

            start_idx = text.find(line)
            headings.append((start_idx, stripped))

    return headings




def force_newlines_before_headings(text):
    """
    Inserts a newline before lines that look like section headings (Title Case or ALL CAPS)
    to improve regex section end detection.
    """
    return re.sub(
        r'(^|\n)(\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,5}\s*:?\s*\n|[A-Z &/().-]{5,}\s*\n)',
        r'\1\2\n\3',
        text
    )


def extract_skills_section(text):
    text = normalize_text(text)
    headings = find_all_headings(text)
    sections = build_sections(text, headings)

    # Try common keys for the skills section:
    for key in sections:
        if any(skill_kw in key for skill_kw in [
            "skills", "technical skills", "soft skills", "key skills", "technologies",
            "languages", "frameworks", "tools", "competencies"
        ]):
            print(f"✅ Found skills section: '{key}'")
            return sections[key]

    print("⚠️ No skills section found.")
    return ""

