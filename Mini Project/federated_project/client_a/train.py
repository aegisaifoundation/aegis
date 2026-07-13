import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType, PeftModel

BASE_MODEL_PATH = "../model/gemma-3-4b-it"
GLOBAL_LORA_PATH = "./received_global"
LOCAL_OUTPUT_PATH = "./local_lora"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ==========================
# Load Base Model
# ==========================

tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    local_files_only=True
)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
    local_files_only=True
)

# ==========================
# Attach OR Load LoRA (ONLY ONE)
# ==========================

global_config = os.path.join(GLOBAL_LORA_PATH, "adapter_config.json")

if os.path.exists(global_config):
    print("Loading global LoRA...")
    model = PeftModel.from_pretrained(model, GLOBAL_LORA_PATH)
else:
    print("No global LoRA found. Creating new LoRA...")

    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"],
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )

    model = get_peft_model(model, lora_config)

model.train()
model.print_trainable_parameters()

# Safety check
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
if trainable == 0:
    raise RuntimeError("LoRA not attached correctly. No trainable params.")

# ==========================
# Load Local Data
# ==========================

with open("data.txt", "r", encoding="utf-8") as f:
    local_text = f.read()

inputs = tokenizer(
    local_text,
    return_tensors="pt",
    truncation=True,
    padding=True
).to(model.device)

if "token_type_ids" not in inputs:
    inputs["token_type_ids"] = torch.zeros_like(inputs["input_ids"])

labels = inputs["input_ids"]

# ==========================
# Train
# ==========================

optimizer = torch.optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=2e-4
)

for step in range(50):
    optimizer.zero_grad()
    outputs = model(**inputs, labels=labels)
    loss = outputs.loss
    loss.backward()
    optimizer.step()

    if step % 10 == 0:
        print(f"[Client] Step {step} | Loss: {loss.item():.4f}")

# ==========================
# Save Local LoRA
# ==========================

os.makedirs(LOCAL_OUTPUT_PATH, exist_ok=True)
model.save_pretrained(LOCAL_OUTPUT_PATH)

print("Local LoRA saved.")