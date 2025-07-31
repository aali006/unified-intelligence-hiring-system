import re

def split_resume_into_chunks(resume_text, min_length=200, max_length=800):
    """
    Splits the resume into logical chunks using headings and line breaks.
    Ensures each chunk is within reasonable size for embedding. 

    Args:
        resume_text (str): The full resume text.
        min_length (int): Minimum characters per chunk (default 200).
        max_length (int): Maximum characters per chunk (default 800).

    Returns:
        List of text chunks.
    """

    # Normalize whitespace and line breaks for consistent splitting
    resume_text = re.sub(r"[ \t]+", " ", resume_text)
    resume_text = re.sub(r"\r\n?", "\n", resume_text)

    # Optional: force newlines before headings to improve split accuracy
    resume_text = force_newlines_before_headings(resume_text)

    # Improved section header regex with optional newlines around headings
    section_headers = re.split(
        r'(?:\n|\r)?\s*(?:Skills|Projects|Experience|Work|Internship|Education|Certifications|Achievements|Summary|Profile)\s*:?\s*(?:\n|\r)?',
        resume_text,
        flags=re.I
    )

    chunks = []

    for section in section_headers:
        section = section.strip()
        if min_length <= len(section) <= max_length:
            chunks.append(section)
        elif len(section) > max_length:
            subchunks = section.split("\n\n")
            for s in subchunks:
                s = s.strip()
                if min_length <= len(s) <= max_length:
                    chunks.append(s)
                elif len(s) > max_length:
                    # If still too long after split, chunk by sentences
                    sentence_chunks = re.split(r'(?<=[.!?])\s+', s)
                    temp_chunk = ""
                    for sentence in sentence_chunks:
                        if len(temp_chunk) + len(sentence) < max_length:
                            temp_chunk += sentence + " "
                        else:
                            if len(temp_chunk.strip()) >= min_length:
                                chunks.append(temp_chunk.strip())
                            temp_chunk = sentence + " "
                    if len(temp_chunk.strip()) >= min_length:
                        chunks.append(temp_chunk.strip())
        elif len(section) < min_length and len(section) > 0 and len(chunks) == 0:
            # Keep first section even if short to avoid empty output
            chunks.append(section)

    print(f"✅ Split into {len(chunks)} chunks.")
    return chunks

def force_newlines_before_headings(text):
    """
    Inserts newlines before common section headings to improve regex splitting accuracy.
    """
    return re.sub(
        r'(^|\n)(\s*)(Skills|Projects|Experience|Work|Internship|Education|Certifications|Achievements|Summary|Profile)\s*:?',
        r'\1\2\n\3',
        text,
        flags=re.I
    )
