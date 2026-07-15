# Phase 8: AI Runtime v2 (AIR v2) Specification

AI Runtime v2 (AIR v2) is the execution brain of the node, handling local models, remote clouds, distributed inference, policy routing, and multi-agent workflow orchestration.

---

## 1. Pluggable Backends

AIR v2 wraps inference libraries as pluggable providers under `IAIBackend`:
*   **`LlamaCppBackend`**: Runs local quantized GGUF models directly on CPU/GPU.
*   **`OllamaBackend`**: Integrates with local Ollama daemon services.
*   **`OpenAIBackend`**: Connects to remote REST endpoints (GPT models).
*   **Placeholders**: Hooks for TensorRT, ONNX, and HuggingFace.

---

## 2. Policy-Driven Execution Router

The `ExecutionPolicyEngine` evaluates safety constraints before routing execution:
-   **Always Local**: Forces execution to use `LlamaCpp` or `Ollama`. Blocks cloud.
-   **Offline Mode**: Blocks all network endpoints, forcing local operations.
-   **Medical Mode**: Enforces that medical queries are processed strictly in local/distributed sandboxed environments. Cloud endpoints are prohibited.

---

## 3. Streaming & Multi-Model Orchestration

- **`StreamingManager`**: Emits tokens chunk-by-chunk and supports stream pause, resume, and cancellation triggers.
- **`ModelOrchestrator`**: Sequences multi-model workflows (e.g. Planner model -> Coder model -> Critic model) dynamically, aggregating trajectories into unified responses.
- **`PromptPipeline`**: Injects context from `memoryManager` and `knowledge-sync`, and applies PII redaction filters before sending the prompt to the backend.
