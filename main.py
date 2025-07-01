from fastapi import FastAPI, UploadFile, Form, HTTPException, Body
from typing import Optional
from datetime import datetime

# Job-related services
from services.mongo_service import (
    store_job_description,
    store_candidate,
    get_role_id_by_name, update_candidate, update_role, delete_role, delete_candidate,
    get_all_roles,
    get_all_candidates
)

from services.qdrant_service import store_jd_embedding, store_resume_embedding, delete_resume_vector, delete_jd_vector
from services.jd_parser import extract_text_from_pdf, extract_text_from_docx
from services.resume_utils import (
    extract_text_from_resume,
    generate_candidate_id,
    generate_numeric_id,
    extract_email,
    extract_github,
    extract_phone,
    extract_skills_section,
    extract_contact_block_for_location,
    extract_location_with_spacy  # ✅ NEW
)
from services.fitment_service import score_fitment_logic
import re

app = FastAPI()

@app.post("/add-role/", status_code=201)
async def add_role(
    role_id: str = Form(...),
    role: str = Form(...),
    positions: int = Form(...),
    jd_text: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = Form(None)
):
    if not jd_text and (jd_file is None or jd_file.filename == ""):
        raise HTTPException(status_code=422, detail="Please provide either JD text or upload a JD file.")

    filename = f"{role.replace(' ', '_')}_{role_id}_jd"

    if jd_file and jd_file.filename:
        file_content = await jd_file.read()
        if jd_file.filename.endswith(".pdf"):
            jd_text = extract_text_from_pdf(file_content)
        elif jd_file.filename.endswith(".docx"):
            jd_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    mongo_status = store_job_description(role_id, role, positions, jd_text, filename)

    try:
        role_id_int = int(role_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="role_id must be numeric")

    qdrant_status = store_jd_embedding(role_id_int, jd_text)

    return {
        "role_id": role_id,
        "stored_as_filename": f"{filename}.ext",
        "mongo_status": mongo_status,
        "qdrant_status": qdrant_status
    }

@app.get("/get-roles/")
async def get_roles():
    return get_all_roles()

@app.put("/update-role/{role_id}")
async def update_role_api(role_id: str, update_data: dict = Body(...)):
    modified = update_role(role_id, update_data)
    if modified:
        return {"message": f"Role {role_id} updated."}
    else:
        raise HTTPException(status_code=404, detail="Role not found or no change applied.")

@app.delete("/delete-role/{role_id}")
async def delete_role_api(role_id: str):
    deleted = delete_role(role_id)
    if deleted:
        delete_jd_vector(int(role_id))
        return {"message": f"Role {role_id} deleted."}
    else:
        raise HTTPException(status_code=404, detail="Role not found.")

@app.post("/add-candidate/", status_code=201)
async def add_candidate(
    name: str = Form(...),
    applied_role: str = Form(...),
    resume_file: UploadFile = Form(...)
):
    if not resume_file.filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    file_bytes = await resume_file.read()

    applied_role_id = get_role_id_by_name(applied_role)
    if applied_role_id is None:
        raise HTTPException(status_code=404, detail=f"Role '{applied_role}' not found.")

    candidate_id_num = generate_numeric_id()
    candidate_id_str = f"CND-{candidate_id_num}"

    resume_text = extract_text_from_resume(file_bytes, resume_file.filename)
    print("🔎 Extracted resume text preview:\n", resume_text[:3000])

    # Extract and refine skills
    raw_skills_text = extract_skills_section(resume_text)
    print("🔎 Raw skills section text:\n", raw_skills_text[:1000])
    lines = raw_skills_text.strip().split("\n")
    filtered_skills = []
    last_line_ended_with_comma = False

    for idx, line in enumerate(lines):
        stripped = line.strip()

        if idx == 0:
            continue

        if (
            stripped
            and (
                stripped.startswith(("•", "-", "◦", "·"))
                or ":" in stripped
                or stripped.count(",") >= 1
            )
            and not re.match(
                r"(?i)(organized|managed|developed|led|worked|responsibilities|designation|president)",
                stripped,
            )
        ):
            filtered_skills.append(stripped)
            last_line_ended_with_comma = stripped.endswith((",", ";"))
        elif last_line_ended_with_comma and stripped:
            filtered_skills.append(stripped)
            last_line_ended_with_comma = stripped.endswith((",", ";"))
        elif (
            stripped
            and len(stripped.split()) == 1
            and stripped.endswith((".", ";", ","))
        ):
            filtered_skills.append(stripped)
        elif stripped:
            words = stripped.split()
            cleaned_words = [re.sub(r'\W+$', '', w) for w in words]
            long_lowercase_words = [w for w in cleaned_words if w.islower() and len(w) >= 6]
            if long_lowercase_words:
                filtered_skills.append(stripped)
                last_line_ended_with_comma = stripped.endswith((",", ";"))
            else:
                break
        else:
            break

    skills_present = filtered_skills
    print("✅ Final skills_present:", skills_present)

    # ✅ Regex + spaCy for location
    email = extract_email(resume_text)
    github = extract_github(resume_text)
    phone = extract_phone(resume_text)

    contact_block = extract_contact_block_for_location(resume_text)
    location = extract_location_with_spacy(contact_block)
    print("✅ spaCy-extracted location:", location)

    ext = resume_file.filename.split(".")[-1]
    stored_file_name = f"{name.replace(' ', '_')}_{applied_role.replace(' ', '_')}_{candidate_id_str}.{ext}"

    mongo_status = store_candidate(
        candidate_id=candidate_id_str,
        name=name,
        applied_role=applied_role,
        applied_role_id=applied_role_id,
        resume_text=resume_text,
        file_bytes=file_bytes,
        stored_file_name=stored_file_name,
        email=email,
        github=github,
        location=location,
        phone=phone,
        timestamp=datetime.now(),
        skills_present=skills_present
    )

    qdrant_status = store_resume_embedding(candidate_id_num, resume_text, name, applied_role)

    return {
        "candidate_id": candidate_id_str,
        "stored_as": stored_file_name,
        "applied_role_id": applied_role_id,
        "mongo_status": mongo_status,
        "qdrant_status": qdrant_status
    }

@app.get("/get-candidates/")
async def get_candidates():
    return get_all_candidates()

@app.put("/update-candidate/{candidate_id}")
async def update_candidate_api(candidate_id: str, update_data: dict = Body(...)):
    modified = update_candidate(candidate_id, update_data)
    if modified:
        return {"message": f"Candidate {candidate_id} updated."}
    else:
        raise HTTPException(status_code=404, detail="Candidate not found or no change applied.")

@app.delete("/delete-candidate/{candidate_id}")
async def delete_candidate_api(candidate_id: str):
    deleted = delete_candidate(candidate_id)
    if deleted:
        delete_resume_vector(candidate_id)
        return {"message": f"Candidate {candidate_id} deleted."}
    else:
        raise HTTPException(status_code=404, detail="Candidate not found.")

@app.get("/score-fitment/{candidate_id}")
async def score_fitment(candidate_id: str):
    result = score_fitment_logic(candidate_id)
    if result:
        return result
    else:
        raise HTTPException(status_code=404, detail="Candidate or Role not found.")
