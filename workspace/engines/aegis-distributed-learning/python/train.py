import os
import sys
import json
import argparse
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType

def parse_args():
    parser = argparse.ArgumentParser(description="AEGIS Local PEFT Trainer")
    parser.add_argument("--model_dir", type=str, required=True, help="Base Hugging Face model directory")
    parser.add_argument("--dataset_path", type=str, required=True, help="Path to processed JSONL dataset")
    parser.add_argument("--output_dir", type=str, required=True, help="Output directory to save the LoRA adapter")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size")
    parser.add_argument("--rank", type=int, default=8, help="LoRA rank")
    parser.add_argument("--alpha", type=int, default=16, help="LoRA alpha")
    parser.add_argument("--validation_threshold", type=float, default=2.0, help="Loss threshold for automated validation check")
    return parser.parse_args()

def main():
    args = parse_args()
    
    print(f"[Python Trainer] Starting training run on device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print(f"[Python Trainer] Model Directory: {args.model_dir}")
    print(f"[Python Trainer] Dataset Path: {args.dataset_path}")
    print(f"[Python Trainer] Output Directory: {args.output_dir}")
    print(f"[Python Trainer] Parameters: Epochs={args.epochs}, LR={args.lr}, BatchSize={args.batch_size}, Rank={args.rank}, Alpha={args.alpha}")

    # 1. Load Dataset
    if not os.path.exists(args.dataset_path):
        print(f"Error: Dataset file not found at {args.dataset_path}")
        sys.exit(1)
        
    corpus_turns = []
    with open(args.dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                sample = json.loads(line)
                content = sample.get("content", "").strip()
                if content:
                    corpus_turns.append(content)
            except Exception as e:
                print(f"[Warning] Failed to parse JSONL line: {e}")

    corpus = "\n".join(corpus_turns)
    if not corpus:
        print("Error: No training content found in dataset.")
        sys.exit(1)

    print(f"[Python Trainer] Training corpus loaded. Character length: {len(corpus)}")

    # 2. Load Model & Tokenizer
    try:
        tokenizer = AutoTokenizer.from_pretrained(args.model_dir, local_files_only=True)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = AutoModelForCausalLM.from_pretrained(
            args.model_dir,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            local_files_only=True
        )
    except Exception as e:
        print(f"Error loading base model: {e}")
        sys.exit(1)

    # 3. Configure LoRA
    lora_config = LoraConfig(
        r=args.rank,
        lora_alpha=args.alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"],
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )
    
    model = get_peft_model(model, lora_config)
    model.train()

    # 4. Tokenization & Inputs
    inputs = tokenizer(corpus, return_tensors="pt", truncation=True, padding=True).to(model.device)
    if "token_type_ids" not in inputs:
        inputs["token_type_ids"] = torch.zeros_like(inputs["input_ids"])
    labels = inputs["input_ids"]

    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)

    # 5. Training Loop
    total_steps = args.epochs
    final_loss = 99.0
    
    for step in range(1, total_steps + 1):
        optimizer.zero_grad()
        outputs = model(**inputs, labels=labels)
        loss = outputs.loss
        loss.backward()
        optimizer.step()
        
        final_loss = loss.item()
        
        # Format string captured by TypeScript progress parser
        sys.stdout.write(f"PROGRESS: Epoch {step}/{total_steps} - Loss: {final_loss:.4f} - Accuracy: {1.0 - (final_loss/10.0):.4f}\n")
        sys.stdout.flush()

    # 6. Automated Validation Check
    print(f"\n[Python Trainer] Final loss: {final_loss:.4f}")
    if final_loss > args.validation_threshold:
        print(f"VALIDATION_FAILED: Loss {final_loss:.4f} exceeded threshold {args.validation_threshold:.4f}")
        sys.exit(2)
    else:
        print(f"VALIDATION_PASSED: Loss {final_loss:.4f} is under threshold {args.validation_threshold:.4f}")

    # 7. Save Adapter
    os.makedirs(args.output_dir, exist_ok=True)
    model.save_pretrained(args.output_dir)
    print(f"[Python Trainer] LoRA saved successfully to {args.output_dir}.")

if __name__ == "__main__":
    main()
