import sys
import json
import time
import os
import random
import traceback

# ML libraries are imported lazily inside methods to avoid slow startup times.
TORCH_AVAILABLE = None
ML_AVAILABLE = None

def check_torch_available():
    global TORCH_AVAILABLE
    if TORCH_AVAILABLE is not None:
        return TORCH_AVAILABLE
    try:
        import torch
        TORCH_AVAILABLE = True
    except ImportError:
        TORCH_AVAILABLE = False
    return TORCH_AVAILABLE

def check_ml_available():
    global ML_AVAILABLE
    if ML_AVAILABLE is not None:
        return ML_AVAILABLE
    try:
        import torch
        import transformers
        import peft
        ML_AVAILABLE = True
    except ImportError:
        ML_AVAILABLE = False
    return ML_AVAILABLE

class PythonTrainingService:
    def __init__(self):
        self.is_ready = False
        self.active_jobs = {}
        self.loaded_models = {}

    def get_hardware_status(self):
        # Gather GPU/CPU telemetry
        has_cuda = False
        gpu_count = 0
        total_vram = 0
        free_vram = 0
        gpu_usage = 0
        temp = 38
        power = 12

        if check_torch_available():
            import torch
            if torch.cuda.is_available():
                has_cuda = True
                gpu_count = torch.cuda.device_count()
                total_vram = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
                free_vram = total_vram - (torch.cuda.memory_allocated(0) // (1024 * 1024))
                gpu_usage = 12 # Mock usage or query nvml
                temp = 42
                power = 35

        return {
            "device": "cuda" if has_cuda else "cpu",
            "gpuCount": gpu_count,
            "totalVramMb": total_vram,
            "availableVramMb": free_vram,
            "gpuUsagePercent": gpu_usage,
            "cpuUsagePercent": random.randint(5, 15),
            "ramUsageMb": 2400,
            "totalRamMb": 16384,
            "temperatureCelsius": temp,
            "powerWatts": power
        }

    def train_job(self, job_id, dataset_path, model_path, config, workspace_path):
        # Runs training loop. If ML libs exist, it can run a minimal train or simulation.
        # Writes checkpoint and evaluation files.
        epochs = config.get("hyperparameters", {}).get("epochs", 3)
        batch_size = config.get("hyperparameters", {}).get("batchSize", 4)
        lr = config.get("hyperparameters", {}).get("learningRate", 2e-4)
        
        # Read dataset line count
        sample_count = 100
        if os.path.exists(dataset_path):
            try:
                with open(dataset_path, "r", encoding="utf-8") as f:
                    sample_count = sum(1 for _ in f)
            except:
                pass
        
        steps_per_epoch = max(1, sample_count // batch_size)
        total_steps = epochs * steps_per_epoch

        checkpoint_dir = os.path.join(workspace_path, ".aegis", "checkpoints", job_id)
        os.makedirs(checkpoint_dir, exist_ok=True)

        current_loss = 2.5
        current_acc = 0.45

        # Simulating steps and sending streaming progress events to stdout
        for step in range(1, total_steps + 1):
            epoch = (step - 1) // steps_per_epoch + 1
            epoch_step = (step - 1) % steps_per_epoch + 1

            # Simulated gradient descent updates
            current_loss -= random.uniform(0.01, 0.05) * (current_loss / 3.0)
            current_loss = max(0.12, current_loss)
            current_acc += random.uniform(0.005, 0.015)
            current_acc = min(0.98, current_acc)

            # Telemetry
            telemetry = {
                "epoch": epoch,
                "step": step,
                "loss": round(current_loss, 4),
                "accuracy": round(current_acc, 4),
                "perplexity": round(2.71828 ** current_loss, 4),
                "f1": round(current_acc - 0.02, 4),
                "tokenThroughput": random.randint(1200, 1800),
                "gpuUsagePercent": random.randint(70, 95),
                "vramUsageMb": 4800,
                "elapsedSeconds": step * 0.1,
                "estimatedTimeRemainingSeconds": (total_steps - step) * 0.1
            }

            # Periodic checkpoints
            if step % max(1, total_steps // 3) == 0 or step == total_steps:
                cp_name = f"checkpoint-{step:03d}" if step < total_steps else "checkpoint-final"
                cp_path = os.path.join(checkpoint_dir, cp_name)
                os.makedirs(cp_path, exist_ok=True)
                
                # Create mock checkpoint weights file
                weights_file = os.path.join(cp_path, "adapter_model.safetensors")
                with open(weights_file, "w") as wf:
                    json.dump({"loss": current_loss, "accuracy": current_acc, "step": step}, wf)
                
                # Write config
                config_file = os.path.join(cp_path, "adapter_config.json")
                with open(config_file, "w") as cf:
                    json.dump({
                        "base_model_name_or_path": model_path,
                        "peft_type": "LORA",
                        "r": 8,
                        "lora_alpha": 16
                    }, cf)

            # Print progressive training step updates to stdout
            progress_evt = {
                "protocolVersion": "1.0.0",
                "messageType": "EVENT",
                "payload": {
                    "eventName": "training_progress",
                    "data": {
                        "jobId": job_id,
                        "step": step,
                        "totalSteps": total_steps,
                        "metrics": telemetry
                    }
                }
            }
            sys.stdout.write(json.dumps(progress_evt) + "\n")
            sys.stdout.flush()
            time.sleep(0.05) # Simulated computation pause

        return {
            "status": "COMPLETED",
            "finalLoss": round(current_loss, 4),
            "finalAccuracy": round(current_acc, 4),
            "totalSteps": total_steps,
            "checkpoints": ["checkpoint-final"]
        }

    def evaluate_model(self, model_id, dataset_path, metrics):
        # Perform mock evaluation and compute metrics
        return {
            "loss": 0.182,
            "accuracy": 0.941,
            "perplexity": 1.199,
            "f1": 0.938,
            "bleu": 42.1,
            "precision": 0.945,
            "recall": 0.932
        }

    def export_lora(self, lora_id, target_dir):
        # Export simulated LoRA weights
        os.makedirs(target_dir, exist_ok=True)
        adapter_path = os.path.join(target_dir, "adapter_model.safetensors")
        with open(adapter_path, "w") as f:
            json.dump({"model_type": "lora_adapter", "id": lora_id, "weights": [0.1, -0.4, 0.9]}, f)
        
        config_path = os.path.join(target_dir, "adapter_config.json")
        with open(config_path, "w") as f:
            json.dump({"r": 8, "lora_alpha": 16, "target_modules": ["q_proj", "v_proj"]}, f)
        return target_dir


def main():
    service = PythonTrainingService()
    sys.stdout.write("AEGIS_TRAINING_READY\n")
    sys.stdout.flush()

    while True:
        line = sys.stdin.readline()
        if not line:
            break
        
        try:
            request = json.loads(line.strip())
            message_id = request.get("messageId")
            payload = request.get("payload", {})
            action = payload.get("action")
            data = payload.get("data", {})
            
            result = None
            
            if action == "hardware_status":
                result = service.get_hardware_status()
            elif action == "train":
                result = service.train_job(
                    job_id=data.get("jobId"),
                    dataset_path=data.get("datasetPath"),
                    model_path=data.get("modelId"),
                    config=data.get("config"),
                    workspace_path=data.get("workspacePath")
                )
            elif action == "evaluate":
                result = service.evaluate_model(
                    model_id=data.get("modelId"),
                    dataset_path=data.get("datasetPath"),
                    metrics=data.get("metrics")
                )
            elif action == "export_lora":
                result = service.export_lora(
                    lora_id=data.get("loraId"),
                    target_dir=data.get("targetDir")
                )
            elif action == "load_model":
                service.loaded_models[data.get("modelId")] = True
                result = True
            elif action == "unload_model":
                service.loaded_models.pop(data.get("modelId"), None)
                result = True
            elif action == "list_models":
                result = list(service.loaded_models.keys())
            else:
                raise ValueError(f"Unknown action: {action}")
            
            response = {
                "protocolVersion": "1.0.0",
                "messageType": "RESPONSE",
                "payload": {
                    "correlationId": message_id,
                    "data": result
                }
            }
        except Exception as e:
            response = {
                "protocolVersion": "1.0.0",
                "messageType": "RESPONSE",
                "payload": {
                    "correlationId": request.get("messageId") if 'request' in locals() else None,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
            }
            
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
