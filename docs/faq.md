# AEGIS Platform Developer FAQ

This Frequently Asked Questions document compiles real-world developer inquiries, diagnostic tips, and architectural designs regarding the AEGIS Microkernel Distributed AI Operating System.

---

## 1. Installation & Environment Troubleshooting

### Q: Why does the daemon bootloader output `Daemon failed to initialize within timeout` on start?
This usually indicates an engine loading failure during the microkernel's startup validation phase. Check the active log file at **`workspace/logs/daemon_boot.log`**.
A common issue is a **mismatched engine dependency ID** in the manifest file or class metadata. For example, if your engine configuration lists a dependency as `distributed-inference` but the target engine registers its ID as `aegis-distributed-inference`, the kernel's topological check will fail and isolate the system in Safe Mode.

---

## 2. Local Training & Weights Layout

### Q: How do I run a local training job and inspect the resulting adapter files?
You can queue a job through the ASDK system call interface. The training engine optimizer executes epochs on your selected framework (e.g., PyTorch) and exports a LoRA adapter.
To inspect the files, run a local training run:
1. **Model Checkpoints**: Saved during training under `.aegis/checkpoints/<job-id>/`.
2. **Exported Adapters**: Saved upon completion under `.aegis/exports/<lora-id>/`.
   * `adapter_config.json`: Hardware/hyperparameter properties.
   * `adapter_model.safetensors`: The optimized delta weight tensors.
   * `export_metadata.json`: The signed audit manifest containing performance statistics and verification hashes.

### Q: Where are models and weights from other nodes saved locally when doing P2P learning?
* **P2P LoRA Adapters**: Saved to **`workspace/lora/`** as `<lora-adapter-id>.json` along with their signed verification key sidecars (`.meta.json`).
* **Active Round Checkpoints**: Saved during collaborative epochs to **`workspace/learning-checkpoints/`**.

---

## 3. Distributed Roles & Swarm Mechanics

### Q: How do I deploy AEGIS on another machine and connect it to my cluster?
1. Clone the repository and run `npm install && npm run build` on Node B.
2. Register default packages by running `node register-default-engines.mjs`.
3. In Node B's configuration (`workspace/config/node.json`), append Node A's IP address and port to the bootstrap `peers` array (e.g., `"192.168.1.50:3010"`).
4. Boot both runtimes using `aegis-cli runtime start`.
5. Call `aegis.discoverNodes()` via the SDK to initiate secure mTLS handshakes.

### Q: If a cluster has 100 nodes but only 15 participate, how do roles work if some are clients, some are servers, and some are aggregators?
In AEGIS, roles are not static; they are dynamically mapped based on the **Capability Registry** of the active participants:
* Nodes with **data/training engines** act as **Workers** (Client nodes).
* Nodes with **averaging/validation engines** act as **Aggregators**.
* Nodes with **directory/distribution engines** act as **Coordinating Servers**.
The server queries the capability registry of the 15 online nodes, assigning training epochs to the Clients, validation/averaging tasks to the Aggregators, and publication tasks to the Servers. If critical capabilities are missing, the system gracefully falls back to delegated aggregation on idle cluster peers.

### Q: What is the difference between an Aggregator and a Server?
* **Aggregator**: Handles **tensor math**. It aggregates weights from clients, runs algorithms like FedAvg, filters out poisoned/malicious updates, and compresses/quantizes weights. It requires GPU compute resources.
* **Server**: Handles **orchestration**. It coordinates node handshakes, indexes active sessions, manages state events, and publishes final models via gateways. It requires storage and network I/O.

---

## 4. Architecture & Design Decisions

### Q: Why is IPC the default local transport rather than WebSockets or gRPC?
Inter-Process Communication (IPC) is the default local transport because it is a low-overhead, low-latency channel that operates entirely within the OS socket space. Unlike TCP networks, it does not require opening external network ports, which mitigates common security vulnerabilities in local desktop installations.

### Q: How should I choose between REST, WebSockets, and gRPC in my integration?
* **REST**: Best for simple, stateless request-response operations like configuration adjustments or listing models.
* **WebSockets**: Ideal for persistent bidirectional streams such as event logging, telemetry updates, and token generation streams.
* **gRPC**: Preferred for enterprise-grade deployments, Kubernetes microservice routing, and cloud-to-edge integrations.

### Q: Why are packages compiled as standard ZIP archives but given `.aeg` and `.aegbundle` extensions?
Defining `.aeg` and `.aegbundle` as logical extensions while maintaining standard ZIP formats enables transparent archiving:
* The extension allows the package manager to immediately identify and validate the asset type (package vs bundle).
* The underlying standard ZIP container ensures cross-platform compatibility, making packaging, compression, and analysis easy.
