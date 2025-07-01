import re

def split_resume_into_chunks(resume_text, min_length=200, max_length=800):
    """
    Splits the resume into logical chunks using headings and line breaks.
    Ensures each chunk is within reasonable size for embedding.
    """
    section_headers = re.split(
        r'\n\s*(?:Skills|Projects|Experience|Work|Internship|Education|Certifications|Achievements|Summary|Profile)\s*:?\s*\n',
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
    return chunks
