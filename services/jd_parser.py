import fitz  # PyMuPDF
import pdfplumber
import tempfile
from docx import Document
import os  # For cleaning up temp files
import io

def extract_text_from_pdf(file_bytes):
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        if len(text.strip()) >= 100:  # sanity check to avoid blank PDFs
            return text
        else:
            raise ValueError("Text too short, falling back to fitz")
    except Exception as e:
        print("⚠️ PDFPlumber failed, falling back to fitz:", e)
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            return "".join([page.get_text() for page in doc])

def extract_text_from_docx(file_bytes):
    # Extracts all text from a DOCX using python-docx
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    doc = Document(tmp_path)
    os.remove(tmp_path)  # Clean up the temp file
    return "\n".join([para.text for para in doc.paragraphs])
