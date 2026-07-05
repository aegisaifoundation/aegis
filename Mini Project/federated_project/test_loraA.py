import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE_MODEL_PATH = "./model/gemma-3-4b-it"
LORA_PATH = "./client_a/local_lora"  # change for client_b or global

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    local_files_only=True
)

max_mem = {0: "5.5GB", "cpu": "16GB"}

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
    device_map="auto",
    max_memory=max_mem,
    local_files_only=True
)

if hasattr(base_model, "_no_split_modules") and isinstance(base_model._no_split_modules, set):
    base_model._no_split_modules = list(base_model._no_split_modules)

model = PeftModel.from_pretrained(
    base_model,
    LORA_PATH,
    max_memory=max_mem
)

model.eval()

prompt = "Hemoglobin is"

inputs = tokenizer(prompt, return_tensors="pt").to(device)
if "token_type_ids" not in inputs:
    inputs["token_type_ids"] = torch.zeros_like(inputs["input_ids"])

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