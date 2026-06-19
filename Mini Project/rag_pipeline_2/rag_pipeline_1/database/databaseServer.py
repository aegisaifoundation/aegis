from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

from rag_pipeline_1.engine.fhir_to_chuck import result   # returns chunks
from rag_pipeline_1.vector_embedding import embed_chunks  # returns vectors


QDRANT_URL = "http://localhost:6333"
COLLECTION = "medical_rag"
VECTOR_SIZE = 384


client = QdrantClient(url=QDRANT_URL)


def ensure_collection():
    try:
        client.get_collection(COLLECTION)
    except Exception:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE
            )
        )


def upload_chunks(chunks, vectors):

    # get existing point count (start ID from here)
    info = client.get_collection(COLLECTION)
    start_id = info.points_count or 0

    points = [
        PointStruct(
            id=start_id + i,
            vector=vectors[i],
            payload={"text": chunks[i]}
        )
        for i in range(len(chunks))
    ]

    client.upsert(
        collection_name=COLLECTION,
        points=points
    )


if __name__ == "__main__":
    chunks = result(r"C:\projects\Mini Project\rag_pipeline_2\rag_pipeline_1\documents\report.pdf")
    vectors = embed_chunks(chunks)
    ensure_collection()
    upload_chunks(chunks, vectors)
    print("Stored", len(chunks), "chunks in Qdrant")
