from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

# Connect to local Qdrant
client = QdrantClient(host="localhost", port=7000)

# Define vector configuration (384-dim cosine similarity)
vector_config = VectorParams(size=384, distance=Distance.COSINE)

collections = ["job_descriptions", "resumes"]

for collection in collections:
    # Try to delete (if exists)
    try:
        client.delete_collection(collection)
        print(f"✅ Deleted Qdrant collection: {collection}")
    except Exception as e:
        print(f"⚠️ Could not delete {collection} (might not exist): {e}")

    # Recreate the collection
    try:
        client.recreate_collection(collection, vectors_config=vector_config)
        print(f"✅ Recreated Qdrant collection: {collection}")
    except Exception as e:
        print(f"❌ Failed to recreate {collection}: {e}")
