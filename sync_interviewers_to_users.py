from services.mongo_service import interviewers_collection, add_user
from services.auth_utils import hash_password

interviewers = interviewers_collection.find({})

for intv in interviewers:
    user_id = intv["interviewer_id"]
    name = intv["name"]
    email = intv["email"]
    department = intv.get("department", "")
    password = "ogints"  # or prompt/set securely

    hashed_pw = hash_password(password)

    status = add_user(
        user_id=user_id,
        name=name,
        email=email,
        hashed_password=hashed_pw,
        role="Interviewer",
        department=department
    )

    print(f"✅ Synced {email} → {status}")
