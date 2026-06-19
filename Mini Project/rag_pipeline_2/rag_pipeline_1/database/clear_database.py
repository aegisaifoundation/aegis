from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

QDRANT_URL = "http://localhost:6333"
COLLECTION = "medical_rag"
VECTOR_SIZE = 384


client = QdrantClient(url=QDRANT_URL)


def clear_database():
    try:
        client.delete_collection(COLLECTION)
        print("Collection deleted")
    except Exception:
        print("Collection not found, creating new one")

    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE
        )
    )

    print("New empty collection created")


if __name__ == "__main__":
    clear_database()