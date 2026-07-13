from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import pprint

pp = pprint.PrettyPrinter(indent=2)

client = QdrantClient(url="http://localhost:6333")
model = SentenceTransformer("all-MiniLM-L6-v2")

query = input("Query: ")

vec = model.encode([query]).tolist()[0]

print("\nVector length:", len(vec))

print("\nRUNNING RAW QUERY...\n")

results = client.query_points(
    collection_name="medical_rag",
    query=vec,
    limit=5,
    with_payload=True,
    with_vectors=False
)

pp.pprint(results)
