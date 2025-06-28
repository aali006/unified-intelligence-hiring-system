from qdrant_client import QdrantClient

client = QdrantClient(host="localhost", port=7000)

for collection in ["job_descriptions", "resumes"]:
    try:
        client.delete_collection(collection)
        print(f"✅ Deleted Qdrant collection: {collection}")
    except Exception as e:
        print(f"⚠️ Could not delete {collection}: {e}")
