from pymongo import MongoClient

# Initialize MongoDB client and database
client = MongoClient("mongodb://localhost:27017/")
db = client["test-positions"]

# Collections
roles_collection = db["roles"]
candidates_collection = db["candidates"]

def get_role_id_by_name(role_name):
    """Fetch role_id from roles collection by role name."""
    result = roles_collection.find_one({"role": role_name})
    return result["role_id"] if result else None

def store_job_description(role_id, role, positions, jd_text, filename):
    """Insert a new job role into MongoDB."""
    result = roles_collection.insert_one({
        "role_id": role_id,
        "role": role,
        "positions": positions,
        "job_description": jd_text,
        "jd_filename": filename,
        "status": "open"
    })
    return str(result.inserted_id)

def store_candidate(candidate_id, name, applied_role, applied_role_id, resume_text, file_bytes, stored_file_name,
                    email, github, location, phone, timestamp, skills_present):

    result = candidates_collection.insert_one({
        "candidate_id": candidate_id,
        "name": name,
        "applied_role": applied_role,
        "applied_role_id": applied_role_id,
        "datetime": timestamp,
        "resume_text": resume_text,
        "email": email,
        "github": github,
        "location": location,
        "phone": phone,
        "skills_present": skills_present,  # ✅ New field
        "file_name": stored_file_name,
        "resume_file": file_bytes
    })
    return str(result.inserted_id)

def get_all_roles():
    """Return all job roles from the DB."""
    return list(roles_collection.find({}, {"_id": 0}))

def get_all_candidates():
    """Return all candidates from the DB."""
    return list(candidates_collection.find({}, {"_id": 0, "resume_file": 0}))

def update_role(role_id, update_data):
    """Update an existing role by role_id."""
    result = roles_collection.update_one(
        {"role_id": role_id},
        {"$set": update_data}
    )
    return result.modified_count

def update_candidate(candidate_id, update_data):
    """Update an existing candidate by candidate_id."""
    result = candidates_collection.update_one(
        {"candidate_id": candidate_id},
        {"$set": update_data}
    )
    return result.modified_count

def delete_role(role_id):
    """Delete a role by its ID."""
    result = roles_collection.delete_one({"role_id": role_id})
    return result.deleted_count

def delete_candidate(candidate_id):
    """Delete a candidate by their ID."""
    result = candidates_collection.delete_one({"candidate_id": candidate_id})
    return result.deleted_count
