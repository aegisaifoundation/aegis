import warnings
warnings.filterwarnings("ignore", category=FutureWarning)



from rag_pipeline_1.engine.fhir_to_chuck import result
from rag_pipeline_1.vector_embedding import embed_chunks
from rag_pipeline_1.search_function import search
from rag_inference import rag_answer
def apiloader(file_path: str) -> str:
	text = result(file_path)
	vectors = embed_chunks(text)
	return vectors

def query(question: str) -> str:
	result = search(question)
	return result

def generate(question: str) -> str:
	result = rag_answer(question)
	return result

if __name__ == "__main__":
	print(generate("HEMOGLOBIN"))