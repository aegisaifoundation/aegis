from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")

points, offset = client.scroll(
    collection_name="medical_rag",
    limit=3,
    with_payload=True,
    with_vectors=True
)

for p in points:
    print("ID:", p.id)
    print("Vector length:", len(p.vector) if p.vector else None)
    print("Payload:", p.payload)
    print("-" * 50)
