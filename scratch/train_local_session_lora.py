import os
import sys
import io
import json
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType

# Set output encoding to UTF-8 to prevent encoding errors on Windows when printing emojis
if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ── Paths ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_MODEL_PATH = os.path.join(BASE_DIR, "models", "TinyLlama-1.1B")
SESSIONS_DIR = os.path.join(BASE_DIR, "memory", "sessions")
LORA_OUTPUT_PATH = os.path.join(BASE_DIR, "workspace", "lora", "lora-TinyLlama-1.1B-adapter")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print(f"[AEGIS Trainer] Base Model Path: {BASE_MODEL_PATH}")
print(f"[AEGIS Trainer] Sessions Path: {SESSIONS_DIR}")
print(f"[AEGIS Trainer] LoRA Output Path: {LORA_OUTPUT_PATH}")
print(f"[AEGIS Trainer] Device: {DEVICE}")

# ── 1. Gather Session Memories ───────────────────────────────────────
print("[AEGIS Trainer] Reading session history files...")
training_texts = []

if os.path.exists(SESSIONS_DIR):
    for session_name in os.listdir(SESSIONS_DIR):
        session_path = os.path.join(SESSIONS_DIR, session_name)
        history_file = os.path.join(session_path, "history.json")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    messages = data.get("messages", [])
                    for msg in messages:
                        role = msg.get("role", "")
                        content = msg.get("content", "").strip()
                        if content:
                            training_texts.append(f"{role}: {content}\n")
            except Exception as e:
                print(f"[AEGIS Trainer] Warning: Failed to read {history_file}: {e}")

# Build corpus text
corpus = "".join(training_texts).strip()

if not corpus:
    print("[AEGIS Trainer] No session memories found. Using placeholder clinical dialogue.")
    corpus = "user: What is Hemoglobin?\nassistant: Hemoglobin is a protein in red blood cells that carries oxygen throughout the body."

print(f"\n--- Training Corpus ---\n{corpus}\n-----------------------\n")

# ── 2. Load Tokenizer & Model ───────────────────────────────────────
print("[AEGIS Trainer] Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH, local_files_only=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

print("[AEGIS Trainer] Loading base model (Safetensors)...")
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
    local_files_only=True
)

# ── 3. Configure LoRA PEFT ──────────────────────────────────────────
print("[AEGIS Trainer] Attaching LoRA config...")
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

# ── 4. Train Model ──────────────────────────────────────────────────
print("[AEGIS Trainer] Tokenizing dataset...")
inputs = tokenizer(corpus, return_tensors="pt", truncation=True, padding=True).to(model.device)
if "token_type_ids" not in inputs:
    inputs["token_type_ids"] = torch.zeros_like(inputs["input_ids"])

labels = inputs["input_ids"]

optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=2e-4)

print("[AEGIS Trainer] Starting fine-tuning steps...")
for step in range(21):
    optimizer.zero_grad()
    outputs = model(**inputs, labels=labels)
    loss = outputs.loss
    loss.backward()
    optimizer.step()
    
    if step % 5 == 0:
        print(f"[AEGIS Trainer] Step {step:2d} | Loss: {loss.item():.4f}")

# ── 5. Save LoRA weights ────────────────────────────────────────────
print(f"[AEGIS Trainer] Saving LoRA adapter to {LORA_OUTPUT_PATH}...")
os.makedirs(LORA_OUTPUT_PATH, exist_ok=True)
model.save_pretrained(LORA_OUTPUT_PATH)
print("[AEGIS Trainer] Training complete! LoRA saved successfully.")
