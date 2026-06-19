import warnings
warnings.filterwarnings("ignore", category=FutureWarning)


from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

model = SentenceTransformer("all-MiniLM-L6-v2")
client = QdrantClient(url="http://localhost:6333")


def search(query, limit=5):
    vec = model.encode([query]).tolist()[0]

    res = client.query_points(
        collection_name="medical_rag",
        query=vec,
        limit=limit,
        with_payload=True
    )

    texts = []
    for p in res.points:
        if p.payload and "text" in p.payload:
            texts.append({
                "text": p.payload["text"],
                "score": p.score
            })

    return texts

if __name__ == "__main__":
	print(search("HEMOGLOBIN"))



