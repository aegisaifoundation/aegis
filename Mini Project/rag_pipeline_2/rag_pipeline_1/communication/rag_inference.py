# rag_inference.py

import warnings
warnings.filterwarnings("ignore")

from llama_cpp import Llama

# 🔹 Import your search function
# Adjust this import based on where search() is defined
from rag_pipeline_1.search_function import search


# 🔹 Load GGUF model + LoRA adapter
llm = Llama(
    model_path="model.gguf",
    lora_path="adapter.gguf",
    n_ctx=2048,
    n_threads=8,
    verbose=False
)


def rag_answer(question, threshold=0.6, limit=5):
    print("\n🔍 Retrieving patient lab data...\n")

    # 🔹 Always retrieve hemoglobin level
    lab_docs = search("HEMOGLOBIN", limit=3)
    lab_filtered = [d for d in lab_docs if d["score"] >= threshold]

    lab_context = "\n".join([d["text"] for d in lab_filtered])

    print("📄 Lab Data:")
    for d in lab_filtered:
        print(f"Score: {round(d['score'], 4)} | {d['text']}")

    print("\n🔍 Retrieving query-related knowledge...\n")

    query_docs = search(question, limit=limit)
    query_filtered = [d for d in query_docs if d["score"] >= threshold]

    query_context = "\n".join([d["text"] for d in query_filtered])

    print("📄 Query Context:")
    for d in query_filtered:
        print(f"Score: {round(d['score'], 4)} | {d['text']}")

    if not lab_context:
        lab_context = "No lab data available."

    if not query_context:
        query_context = "No additional medical context retrieved."

    final_context = f"""
Patient Lab Data:
{lab_context}

Medical Context:
{query_context}
"""

    print("\n🧠 Generating reasoning answer...\n")

    response = llm.create_chat_completion(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a clinical medical assistant. "
                    "Use patient lab data and medical reasoning. "
                    "If lab value is normal, explain appropriately. "
                    "Do not hallucinate values."
                ),
            },
            {
                "role": "user",
                "content": f"{final_context}\n\nQuestion:\n{question}",
            },
        ],
        max_tokens=250,
        temperature=0.3,
    )

    return response["choices"][0]["message"]["content"].strip()

# 🔹 Run Example
if __name__ == "__main__":
    question = input("prompt")
    result = rag_answer(question, threshold=0.6)
    print("\n✅ Final Answer:\n")
    print(result)