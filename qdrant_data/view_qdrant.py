from qdrant_client import QdrantClient

client = QdrantClient(host="localhost", port=7000)

def view_collection(collection_name):
    print(f"\n--- Viewing Collection: {collection_name} ---\n")
    response = client.scroll(
        collection_name=collection_name,
        limit=10,
        with_payload=True,
        with_vectors=True
    )

    for point in response[0]:
        print(f"ID: {point.id}")
        print(f"Payload: {point.payload}")
        print(f"Vector length: {len(point.vector)}")
        print(f"First 10 vector values: {point.vector[:10]}\n")


if __name__ == "__main__":
    view_collection("job_descriptions")
    view_collection("resumes")


