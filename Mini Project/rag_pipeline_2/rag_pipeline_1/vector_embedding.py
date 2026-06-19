from sentence_transformers import SentenceTransformer
from rag_pipeline_1.engine.fhir_to_chuck import result 

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_chunks(chunks):
    return model.encode(chunks).tolist()
chunks = result(r"C:\projects\rag_pipeline_1\documents\Comprehensive Health Report.pdf")
vectors = embed_chunks(chunks)
#print(vectors)


