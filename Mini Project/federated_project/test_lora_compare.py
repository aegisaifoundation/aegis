from llama_cpp import Llama

MODEL_PATH = "./model.gguf"

CLIENT_A_LORA = "./client_a/local_lora/adapter_model.safetensors"
CLIENT_B_LORA = "./client_b/local_lora/adapter_model.safetensors"
GLOBAL_LORA   = "./global_lora/adapter_model.safetensors"

QUESTION = "Patient has low hemoglobin. Explain possible causes."

def run_model(lora_path=None, label="Base"):
    print("\n==============================")
    print(f"Testing: {label}")
    print("==============================")

    if lora_path:
        llm = Llama(
            model_path=MODEL_PATH,
            lora_path=lora_path,
            n_ctx=2048,
            n_threads=8
        )
    else:
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,
            n_threads=8
        )

    output = llm(
        QUESTION,
        max_tokens=150,
        temperature=0.7
    )

    print("\nAnswer:\n")
    print(output["choices"][0]["text"])


if __name__ == "__main__":

    # 1️⃣ Base
    run_model(label="Base Model")

    # 2️⃣ Client A
    run_model(CLIENT_A_LORA, "Client A LoRA")

    # 3️⃣ Client B
    run_model(CLIENT_B_LORA, "Client B LoRA")

    # 4️⃣ Global Federated
    run_model(GLOBAL_LORA, "Global Federated LoRA")