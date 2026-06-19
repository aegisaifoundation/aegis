import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE_MODEL_PATH = "./model/TinyLlama-1.1B"
LORA_PATH = "./client_a/local_lora"  # change for client_b or global

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    local_files_only=True
)

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    local_files_only=True
)

model = PeftModel.from_pretrained(
    base_model,
    LORA_PATH
)

model.to(device)
model.eval()

prompt = "Hemoglobin is"

inputs = tokenizer(prompt, return_tensors="pt").to(device)

with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=50,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        pad_token_id=tokenizer.eos_token_id
    )

response = tokenizer.decode(outputs[0], skip_special_tokens=True)

print("\n=== LORA OUTPUT ===\n")
print(response)