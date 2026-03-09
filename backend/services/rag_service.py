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


import ollama
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from services.mongo_service import candidates_collection

# 1. Initialize Tools
# Use the same model you used to embed the resumes originally
embedder = SentenceTransformer('all-MiniLM-L6-v2')
client = QdrantClient(host="127.0.0.1", port=6333)

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


import ollama

def get_hr_chat_response(user_query: str, stream: bool = False):
    try:
        # STEP 1: Create a Vector for the search
        query_vector = embedder.encode(user_query).tolist()

        # STEP 2: Search Qdrant
        search_results = []
        try:
            response = client.query_points(
                collection_name="resumes",
                query=query_vector,
                limit=3,
                with_payload=True
            )
            search_results = response.points
        except AttributeError:
            search_results = client.search(
                collection_name="resumes",
                query_vector=query_vector,
                limit=3,
                with_payload=True
            )

        # STEP 3: Build Context from MongoDB
        context_blocks = []
        for hit in search_results:
            c_id = hit.payload.get("candidate_id")
            name = hit.payload.get("name")
            
            candidate = candidates_collection.find_one({
                "$or": [{"candidate_id": c_id}, {"name": {"$regex": str(name), "$options": "i"}}]
            })
            
            if candidate:
                context_blocks.append(
                    f"CANDIDATE: {candidate.get('name')}\n"
                    f"ROLE: {candidate.get('applied_role')}\n"
                    f"RESUME INFO: {candidate.get('resume_text')[:500]}\n"
                    f"STATUS: {candidate.get('status')}"
                )

        # STEP 4: Combine Context
        final_context = "\n---\n".join(context_blocks) if context_blocks else "No matching candidates found in database."

        # STEP 5: The "Hybrid" Prompt
        prompt = f"""
        You are an HR Assistant. Use the context below to answer internal questions. 
        If the context is empty, answer using your general knowledge.

        INTERNAL DATABASE CONTEXT:
        {final_context}

        QUESTION: {user_query}
        """

        # STEP 6: Call Ollama with Streaming logic
        if stream:
            # This returns a generator that yields chunks
            response = ollama.generate(model="llama3.1:8b-instruct-q2_K", prompt=prompt, stream=True)
            def generator():
                for chunk in response:
                    yield chunk['response']
            return generator() # Return the generator itself
        else:
            # Standard behavior
            output = ollama.generate(model="llama3.1:8b-instruct-q2_K", prompt=prompt)
            return output['response']

    except Exception as e:
        error_msg = f"Lion encountered an issue: {str(e)}"
        if stream:
            def error_gen(): yield error_msg
            return error_gen()
        return error_msg