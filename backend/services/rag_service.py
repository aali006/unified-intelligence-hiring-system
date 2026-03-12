# import ollama
# from qdrant_client import QdrantClient
# from sentence_transformers import SentenceTransformer
# from services.mongo_service import candidates_collection

# # 1. Initialize tools
# # Use the same model used during the initial resume indexing
# embedder = SentenceTransformer('all-MiniLM-L6-v2')
# client = QdrantClient(host="127.0.0.1", port=6333)

# def get_hr_chat_response(user_query: str):
#     """
#     Handles both general HR questions and specific candidate queries.
#     """
#     try:
#         # STEP 1: Vectorize the query
#         query_vector = embedder.encode(user_query).tolist()

#         # STEP 2: Search Qdrant (The 'Vector' search)
#         # Using a try/except specifically for the search method
#         try:
#             search_results = client.search(
#                 collection_name="resumes",
#                 query_vector=query_vector,
#                 limit=3,
#                 with_payload=True
#             )
#         except Exception as e:
#             print(f"Qdrant Search Error: {e}")
#             search_results = []

#         # STEP 3: Gather Context from MongoDB
#         context_text = ""
#         if search_results:
#             for hit in search_results:
#                 c_id = hit.payload.get("candidate_id")
#                 candidate = candidates_collection.find_one({"candidate_id": c_id})
#                 if candidate:
#                     context_text += (
#                         f"Candidate: {candidate.get('name')}\n"
#                         f"Role: {candidate.get('applied_role')}\n"
#                         f"Experience: {candidate.get('resume_text')[:400]}\n"
#                         f"Status: {candidate.get('status')}\n---\n"
#                     )

#         # STEP 4: Build the Prompt
#         # This prompt tells the LLM to use context if it exists, otherwise use its own knowledge.
#         system_instructions = (
#             "You are an HR Intelligent Assistant. "
#             "If the context below contains candidate information, use it to answer. "
#             "If not, answer the HR's general question professionally.\n\n"
#             f"CONTEXT FROM DATABASE:\n{context_text if context_text else 'No specific candidate data found.'}\n\n"
#             f"USER QUESTION: {user_query}"
#         )

#         # STEP 5: Generate Response using Ollama
#         # Note: Ensure you have 'llama3' or your preferred model pulled in Ollama
#         response = ollama.generate(model="llama3.1:8b-instruct-q2_K", prompt=system_instructions)
#         return response['response']

#     except Exception as e:
#         return f"I'm sorry, I ran into a snag: {str(e)}"


# import ollama
import requests
import re
# from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from services.mongo_service import candidates_collection
from services.qdrant_service import qdrant_client as client

# 1. Initialize Tools
# Use the same model you used to embed the resumes originally
embedder = SentenceTransformer('all-MiniLM-L6-v2')
# client = QdrantClient(host="127.0.0.1", port=6333)


# def get_hr_chat_response(user_query: str):
#     try:
#         # STEP 1: Create a Vector for the search
#         query_vector = embedder.encode(user_query).tolist()

#         # STEP 2: Search Qdrant (Using the most compatible method)
#         # We try 'query_points' first (Newer) then 'search' (Older) as fallback
#         search_results = []
#         try:
#             # Modern Qdrant version (1.10+)
#             response = client.query_points(
#                 collection_name="resumes",
#                 query=query_vector,
#                 limit=3,
#                 with_payload=True
#             )
#             search_results = response.points
#         except AttributeError:
#             # Legacy/Stable fallback
#             search_results = client.search(
#                 collection_name="resumes",
#                 query_vector=query_vector,
#                 limit=3,
#                 with_payload=True
#             )

#         # STEP 3: Build Context from MongoDB
#         context_blocks = []
#         for hit in search_results:
#             # Search by name or candidate_id from the vector payload
#             c_id = hit.payload.get("candidate_id")
#             name = hit.payload.get("name")
            
#             # Fetch full data from Mongo
#             candidate = candidates_collection.find_one({
#                 "$or": [{"candidate_id": c_id}, {"name": {"$regex": str(name), "$options": "i"}}]
#             })
            
#             if candidate:
#                 context_blocks.append(
#                     f"CANDIDATE: {candidate.get('name')}\n"
#                     f"ROLE: {candidate.get('applied_role')}\n"
#                     f"RESUME INFO: {candidate.get('resume_text')[:500]}\n"
#                     f"STATUS: {candidate.get('status')}"
#                 )

#         # STEP 4: Combine Context
#         final_context = "\n---\n".join(context_blocks) if context_blocks else "No matching candidates found in database."

#         # STEP 5: The "Hybrid" Prompt
#         prompt = f"""
#         You are an HR Assistant. Use the context below to answer internal questions. 
#         If the context is empty, answer using your general knowledge.

#         INTERNAL DATABASE CONTEXT:
#         {final_context}

#         QUESTION: {user_query}
#         """

#         # STEP 6: Call Ollama
#         output = ollama.generate(model="llama3.1:8b-instruct-q2_K", prompt=prompt)
#         return output['response']

#     except Exception as e:
#         return f"Lion encountered an issue: {str(e)}"


# import ollama

def get_hr_chat_response(user_query: str, stream: bool = False):

    try:

        context_blocks = []

        # ------------------------------
        # STEP 1: Try Name Detection
        # ------------------------------
        candidate = candidates_collection.find_one(
            {"name": {"$regex": user_query, "$options": "i"}}
        )

        if candidate:

            context_blocks.append(
                f"""
CANDIDATE: {candidate.get('name')}
ROLE: {candidate.get('applied_role')}

RESUME INFORMATION:
{candidate.get('resume_text')}
"""
            )

        else:

            # ------------------------------
            # STEP 2: Semantic Search
            # ------------------------------
            query_vector = embedder.encode(user_query).tolist()

            response = client.query_points(
                collection_name="resumes",
                query=query_vector,
                limit=3,
                with_payload=True
            )

            for hit in response.points:

                numeric_id = hit.payload.get("candidate_id")

                if numeric_id is None:
                    continue

                mongo_id = f"CND-{numeric_id}"

                candidate = candidates_collection.find_one(
                    {"candidate_id": mongo_id}
                )

                if candidate:

                    context_blocks.append(
                        f"""
CANDIDATE: {candidate.get('name')}
ROLE: {candidate.get('applied_role')}

RESUME INFORMATION:
{candidate.get('resume_text')}
"""
                    )

        # ------------------------------
        # STEP 3: Build Context
        # ------------------------------
        if context_blocks:
            final_context = "\n---\n".join(context_blocks)
        else:
            final_context = "No matching candidates found."

        # ------------------------------
        # STEP 4: Prompt
        # ------------------------------
        prompt = f"""
You are an HR assistant.

Each candidate block represents a different person.

Use ONLY the information inside each candidate block.

Do NOT mix information between candidates.

DATABASE CONTEXT:
{final_context}

QUESTION:
{user_query}
"""

        # ------------------------------
        # STEP 5: Call Ollama
        # ------------------------------
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": prompt,
                "stream": stream
            },
            stream=stream,
            timeout=300
        )

        # ------------------------------
        # Streaming Mode
        # ------------------------------
        if stream:

            import json

            def generator():

                for line in response.iter_lines():

                    if line:

                        data = json.loads(line.decode())

                        token = data.get("response", "")

                        yield token

                        if data.get("done"):
                            break

            return generator()

        # ------------------------------
        # Normal Mode
        # ------------------------------
        else:

            data = response.json()

            return data.get("response", "")

    except Exception as e:

        error_msg = f"Lion encountered an issue: {str(e)}"

        if stream:

            def error_gen():
                yield error_msg

            return error_gen()

        return error_msg


import re

def extract_candidate_name(query):
    candidates = candidates_collection.find({}, {"name": 1})

    for c in candidates:
        name = c["name"]
        if re.search(rf"\b{name}\b", query, re.IGNORECASE):
            return name

    return None


# ---------------------------------------

# import requests
# import re
# from sentence_transformers import SentenceTransformer
# from services.mongo_service import candidates_collection
# from services.qdrant_service import qdrant_client as client

# # Initialize embedding model
# embedder = SentenceTransformer("all-MiniLM-L6-v2")


# # ------------------------------
# # Helper: Detect candidate name
# # ------------------------------
# def extract_candidate_name(query):
#     candidates = candidates_collection.find({}, {"name": 1})

#     for c in candidates:
#         name = c["name"]
#         if re.search(rf"\b{name}\b", query, re.IGNORECASE):
#             return name

#     return None


# # ------------------------------
# # Main HR Assistant Function
# # ------------------------------
# def get_hr_chat_response(user_query: str, stream: bool = False):

#     try:

#         context_blocks = []

#         # --------------------------------------------------
#         # STEP 1: Check if query mentions a specific person
#         # --------------------------------------------------
#         candidate_name = extract_candidate_name(user_query)

#         if candidate_name:

#             candidate = candidates_collection.find_one({"name": candidate_name})

#             if candidate:
#                 context_blocks.append(
#                     f"""
# CANDIDATE: {candidate.get('name')}
# ROLE: {candidate.get('applied_role')}

# RESUME INFORMATION:
# {candidate.get('resume_text')}
# """
#                 )

#         else:

#             # --------------------------------------------------
#             # STEP 2: Vector Search (Semantic Retrieval)
#             # --------------------------------------------------
#             query_vector = embedder.encode(user_query).tolist()

#             response = client.query_points(
#                 collection_name="resumes",
#                 query=query_vector,
#                 limit=3,
#                 with_payload=True
#             )

#             search_results = response.points

#             # --------------------------------------------------
#             # STEP 3: Fetch full resume from MongoDB
#             # --------------------------------------------------
#             for hit in search_results:

#                 numeric_id = hit.payload.get("candidate_id")

#                 if numeric_id is None:
#                     continue

#                 mongo_id = f"CND-{numeric_id}"

#                 candidate = candidates_collection.find_one(
#                     {"candidate_id": mongo_id}
#                 )

#                 if candidate:

#                     context_blocks.append(
#                         f"""
# CANDIDATE: {candidate.get('name')}
# ROLE: {candidate.get('applied_role')}

# RESUME INFORMATION:
# {candidate.get('resume_text')}
# """
#                     )

#         # --------------------------------------------------
#         # STEP 4: Combine Context
#         # --------------------------------------------------
#         if context_blocks:
#             final_context = "\n---\n".join(context_blocks)
#         else:
#             final_context = "No matching candidates found in the database."

#         # --------------------------------------------------
#         # STEP 5: Build Prompt
#         # --------------------------------------------------
#         prompt = f"""
# You are an HR assistant.

# Each candidate block represents a different person.

# When answering about a candidate, ONLY use the information
# under that candidate's name.

# Do NOT mix information between candidates.

# DATABASE CONTEXT:
# {final_context}

# QUESTION:
# {user_query}
# """

#         # --------------------------------------------------
#         # STEP 6: Call Ollama
#         # --------------------------------------------------
#         response = requests.post(
#             "http://localhost:11434/api/generate",
#             json={
#                 "model": "llama3.2:1b",
#                 "prompt": prompt,
#                 "stream": False
#             },
#             timeout=300
#         )

#         data = response.json()
#         return data.get("response", "")

#     except Exception as e:

#         error_msg = f"Lion encountered an issue: {str(e)}"

#         if stream:
#             def error_gen():
#                 yield error_msg
#             return error_gen()

#         return error_msg