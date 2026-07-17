# AEGIS
### Enterprise AI Operating System

![Build](https://img.shields.io/badge/BUILD-ACTIVE-brightgreen)
![License](https://img.shields.io/badge/LICENSE-MIT-green)
![Architecture](https://img.shields.io/badge/ARCHITECTURE-Distributed-orange)
![Runtime](https://img.shields.io/badge/Runtime-TypeScript%20%2B%20C%2B%2B20-blue)
![UI](https://img.shields.io/badge/UI-Desktop%20SPA-purple)

---

## What is AEGIS?

**AEGIS** is an **Enterprise AI Operating System** — a complete platform for running, managing, and orchestrating AI agents, models, tools, and distributed computing workloads.

It is not a single AI model. It is the operating environment where:

- AI agents run as managed **Engines** with full lifecycles
- Memory is a durable, structured **subsystem** with integrity guarantees
- Tools, Skills, and Plugins are **hot-swappable capabilities**
- AI models are interchangeable **Providers** (local GGUF, Ollama, remote API)
- Distributed computing is powered by a **native C++20 runtime**

Current domain application: **Clinical AI** — with local GGUF model inference and medical tooling.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Desktop UI (Port 5001)                      │
│   3-column SPA · Session management · Chat streaming    │
├─────────────────────────────────────────────────────────┤
│              REST API Server (Port 3005)                  │
│   Sessions · Chat/SSE · Capabilities · Providers        │
├─────────────────────────────────────────────────────────┤
│             TypeScript Runtime Kernel                    │
│   Bootloader · EngineManager · EventBus · SessionMgr    │
├──────────────────┬──────────────────┬───────────────────┤
│  Memory Engine   │  AI Agent Engine │  REST API Engine  │
│  (priority: 5)   │  (priority: 10)  │  (priority: 20)   │
├─────────────────────────────────────────────────────────┤
│          C++20 Distributed Intelligence Engine           │
│   Node · Discovery · Heartbeat · AIR · DIS · Resources  │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|------------|---------|
| Node.js | 20+ |
| Python | 3.10+ |
| npm | 8+ |
| CMake | 3.15+ (for C++ compilation) |
| llama-cpp-python | latest |

---

## Installation on Another Computer

AEGIS is designed to be fully portable. Depending on the target operating system, follow one of the installation methods below:

### Option A: Automated Installation (Windows)
If the target computer is running Windows, you can automate configuration, key generation, workspace setup, and building via PowerShell:
1. Open PowerShell as Administrator.
2. Run the installer script in the repository root:
   ```powershell
   .\install.ps1
   ```
   *This automatically generates directory sandboxes, creates the `runtime.json` config, signs certificates, installs NPM packages, and builds node workspaces.*

### Option B: Manual Installation (Linux / macOS / Windows)
For Linux, macOS, or custom Windows environments, perform the installation manually:

1. **Install Node.js dependencies & build TypeScript packages**:
   ```bash
   # Install NPM packages
   npm install

   # Compile TypeScript workspaces (package manager, runtime, CLI, bootloader)
   npm run build --workspaces
   ```

2. **Compile the C++ Native Distributed Intelligence Engine (DIE)**:
   Since the native socket transport and discovery libraries are compiled for the host architecture, build the executable using CMake:
   ```bash
   cd packages/aegis-distributed-intelligence
   mkdir build && cd build
   cmake ..
   cmake --build . --config Release

   # Copy the built binary into the package's dist folder
   # On Linux/macOS:
   cp die-service ../dist/
   # On Windows:
   copy die-service.exe ..\dist\
   ```

3. **Register Pluggable Engines**:
   Initialize and sync the default engine registry from the repository root:
   ```bash
   cd ../../..
   node register-default-engines.mjs
   ```

---

## Multi-Node Setup (Connecting Two Nodes)

The C++ **Distributed Intelligence Engine (DIE)** handles native peer-to-peer (P2P) discovery and raw TCP socket messaging. To connect two separate computers (Node A and Node B):

1. **Node Configuration**: Configure custom ports and names for each node in their respective daemons.
   - **Node A**:
     ```typescript
     await nodeA.configure({ nodeName: 'node-A', port: 9801 });
     ```
   - **Node B**:
     ```typescript
     await nodeB.configure({ nodeName: 'node-B', port: 9802 });
     ```

2. **Peer Registration**: Connect the nodes by registering their target IP address and port mapping into each other's discovery service:
   - **Node A registration of Node B**:
     ```typescript
     await nodeA.discoveryService.registerNode('node-B', '<NODE_B_IP>', 9802);
     ```
   - **Node B registration of Node A**:
     ```typescript
     await nodeB.discoveryService.registerNode('node-A', '<NODE_A_IP>', 9801);
     ```

3. **Verification**: Once registered, nodes will establish persistent, encrypted TCP connections and will appear in each other's verified peer list when querying:
   ```typescript
   const peers = await nodeA.discoveryService.discoverNodes();
   // Output: ['node-B']
   ```

---

## Distributed Learning Workflows

AEGIS coordinates decentralized model training across connected nodes using the **Federated Learning Engine** or the **Swarm Learning Engine**.

### 1. Federated Learning (FedAvg)
In a Federated Learning scenario, one node acts as the central **Coordinator (Master)** and all other connected nodes act as **Workers**.

```
  ┌──────────────┐
  │ Coordinator  │◄─────────────────────────────┐
  └──────┬───────┘                              │
         │ (1) Broadcasts round weights         │ (3) Sends local updates
         ▼                                      │
  ┌──────────────┐      ┌──────────────┐      ┌─┴────────────┐
  │   Worker A   │      │   Worker B   │      │   Worker C   │
  └──────────────┘      └──────────────┘      └──────────────┘
```

1. **Initiating the Round**: The coordinator node triggers the sync round by calling `triggerGlobalModelSync()`:
   ```typescript
   await federatedEngine.triggerGlobalModelSync();
   ```
   *This broadcasts a `federated_round_start` message with the current base model weights to all active peers discovered via the P2P transport layer.*
2. **Local Client Training**: Worker nodes receive the round start notification, run local epochs on their own datasets, and calculate gradient updates:
   ```typescript
   // Internal callback triggered in worker nodes:
   await workerEngine.runLocalTrainingRound(roundId, globalWeights, coordinatorId);
   ```
3. **Weight Return**: Worker nodes reply by sending their encrypted, locally-trained weights (`federated_round_weights`) back to the coordinator.
4. **Aggregation**: The coordinator collects the worker weights, applies the **FedAvg** algorithm to generate a new global model, and redistributes it.

### 2. Swarm Learning (Decentralized Peer-to-Peer)
Swarm Learning removes the single-point-of-failure Coordinator. Instead, nodes perform peer-to-peer weight exchanges guided by deterministic consensus.

1. **Leader Election**: Swarm nodes deterministically elect a temporary round leader based on numerical ID sorting (lowest ID wins). The election is proposed peer-to-peer:
   ```typescript
   await swarmEngine.triggerLeaderElection();
   ```
2. **Start Swarm Round**: Any peer node triggers the swarm-wide training round:
   ```typescript
   await swarmEngine.startSwarmRound();
   ```
   *This publishes a `swarm_round_started` event over the distributed network.*
3. **Local Epoch & Submission**: Nodes execute local learning loops and submit their weights directly to the currently elected leader node using `swarm_model_weights`.
4. **Consensus Aggregation**: The elected leader aggregates weights from all active peers (`tryAggregateSwarm()`) and broadcasts the aggregated weights (`swarm_aggregated_weights`) back to the swarm, updating all nodes.

---

## How to Run AEGIS

1. **Start the Daemon (Core Runtime)**:
   ```bash
   node --import tsx --experimental-specifier-resolution=node --no-warnings packages/aegis-runtime/src/daemon.ts
   ```

2. **Start the Desktop Application UI**:
   ```bash
   python apps/desktop/main.py
   ```
   *Open your web browser and navigate to **`http://localhost:5001`** to access the Aegis console.*

---

## Project Structure

```
aegis/
├── package.json                    # npm workspaces (apps/* + packages/*)
├── install.ps1                     # Windows automated setup
├── register-default-engines.mjs    # Engine registry bootstrapper
├── models/                         # GGUF base models (e.g. model.gguf)
│
├── apps/
│   ├── desktop/                    # Desktop SPA + Python GGUF server
│   │   ├── index.html              # Main SPA shell
│   │   ├── app.js                  # All UI logic
│   │   ├── style.css               # Design system
│   │   └── main.py                 # Python server + GGUF bridge
│   ├── aegis-cli/                  # CLI application
│   ├── aegis-boot/                 # Boot application
│   └── terminal/                  # Terminal UI
│
├── packages/
│   ├── aegis-sdk/                  # Shared interfaces & types
│   ├── aegis-runtime/              # Runtime Kernel (Bootloader, EngineManager, etc.)
│   ├── aegis-agent/                # AI Agent Engine
│   ├── aegis-memory/               # Cognitive Memory System
│   ├── aegis-distributed-intelligence/ # C++20 native runtime (DIE)
│   ├── aegis-providers/            # AI model provider abstraction
│   ├── aegis-tools/                # Tool registry & loader
│   ├── aegis-skills/               # Skill registry & loader
│   ├── aegis-plugins/              # Plugin registry & loader
│   └── aegis-package-manager/      # Capability package manager
│
├── engines/                        # Engine registry entries (engine.json)
│   ├── aegis-memory/engine.json    # Memory Engine (priority 5)
│   ├── aegis-agent/engine.json     # AI Agent Engine (priority 10)
│   └── aegis-api/engine.json       # REST API Engine (priority 20)
│
├── providers/                      # AI model providers
│   ├── local/gguf/                 # Local GGUF (llama-cpp-python bridge)
│   ├── local/ollama/               # Ollama local inference
│   └── api/                        # Remote API providers
│
├── tools/shared/                   # Built-in tools
│   ├── FileTool/ FolderTool/ MemoryTool/
│   ├── PatientDataTool/ SystemTool/ TerminalTool/
│   └── memory-read/ memory-write/ memory-delete/
│
├── skills/shared/                  # Built-in skills
│   ├── extract/ format/ generate/ summarize/
│   ├── follow-up-recommendation/ lifestyle-recommendation/
│   ├── patient-history-summarizer/ patient-timeline-builder/
│
├── plugins/shared/                 # System plugins
│   └── analytics/ auth/ cache/ encryption/ logging/ monitoring/ ...
│
└── memory/                         # Runtime memory store (filesystem)
    ├── sessions/                   # Session memory directories
    ├── trash/                      # Soft-deleted sessions
    └── snapshots/                  # Session snapshots
```

---

## Components

### Runtime Kernel (`packages/aegis-runtime`)

The TypeScript orchestration layer. Manages the full system lifecycle:

- **Bootloader**: 5-phase startup sequence (hardware → config → DI → storage → engines)
- **EngineManager**: Topological dependency-ordered engine loading with hot-reload
- **EventBus**: 100+ typed events for decoupled inter-component communication
- **RuntimeExecutor**: ReAct agent loop (max 5 steps, streaming)
- **RuntimeSessionManager**: Session lifecycle (create, checkout, delete, restore, rename)
- **CapabilityManager**: Hot-swap tools/skills/plugins/providers without restart
- **IPC Server**: Control channel for management scripts

### Memory System (`packages/aegis-memory`)

Durable session-scoped memory with integrity guarantees:

- Sessions stored as filesystem directories with 6 structured files
- SHA-256 checksums on all files — corruption triggers quarantine + recovery
- Write buffer coalesces high-frequency writes during streaming
- Projection system generates focused memory summaries for agent prompts
- ACID-like transaction manager for multi-file atomic operations

### AI Agent Engine (`packages/aegis-agent`)

The ReAct reasoning engine:

- **ReAct Loop**: Reason → Act (tool use) → Observe → repeat
- **PromptBuilder**: Assembles system prompt with memory projections
- **Provider-agnostic**: Routes to whichever provider is active (GGUF, Ollama, API)
- **GGUF Fast Path**: Bypasses ReAct for local small models (direct streaming)

### Desktop UI (`apps/desktop`)

A full enterprise desktop interface:

- **3-column layout**: Session sidebar, chat panel, capabilities panel
- **Streaming chat**: SSE-based real-time token display
- **Session management**: Create, switch, rename, delete, restore, search
- **Capability management**: Add/remove tools, skills, plugins dynamically
- **Provider selector**: Switch AI providers in-app
- **LoRA manager**: Attach/detach LoRA adapters at runtime

### Distributed Intelligence Engine (DIE)

C++20 native runtime for distributed computing:

- Node identity, lifecycle, and cluster membership
- TCP transport for node-to-node communication
- Node discovery and heartbeat liveness monitoring
- System resource monitoring (CPU/RAM/GPU telemetry)
- AI Runtime (AIR): agent scheduling across cluster nodes
- Distributed Inference Service (DIS): route inference to best node

---

## API Reference

The REST API runs on **Port 3005** (localhost only):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | New session |
| POST | `/api/sessions/checkout` | Switch session |
| GET | `/api/sessions/active` | Active session details |
| POST | `/api/chat` | Chat (SSE stream) |
| GET | `/api/capabilities` | List tools/skills/plugins |
| POST | `/api/capabilities/add` | Add capability |
| POST | `/api/capabilities/remove` | Remove capability |
| GET | `/api/providers` | List providers |
| POST | `/api/providers/switch` | Switch provider |
| POST | `/api/shutdown` | Graceful shutdown |

---

## Documentation

| Document | Description |
|----------|-------------|
| [aegis_system_architecture_report.md](./aegis_system_architecture_report.md) | Full architecture with diagrams, data flows, and folder structure |
| [aegis_platform_specification.md](./aegis_platform_specification.md) | Platform concepts, APIs, and technology stack |
| [aegis_core_runtime_specification.md](./aegis_core_runtime_specification.md) | Runtime Kernel deep-dive and specifications |
| [aegis_memory_subsystem_report.md](./aegis_memory_subsystem_report.md) | Memory system design, data models, and APIs |
| [aegis_event_bus_report.md](./aegis_event_bus_report.md) | Complete event type reference |
| [aegis_federated_learning_report.md](./aegis_federated_learning_report.md) | Distributed Intelligence Engine (C++20) reference |
| [aegis_cognitive_memory_redesign.md](./aegis_cognitive_memory_redesign.md) | Memory architecture design decisions |
| [aegis_modular_refactoring_blueprint.md](./aegis_modular_refactoring_blueprint.md) | Package structure and module boundaries |
| [aegis_architecture_review.md](./aegis_architecture_review.md) | Architectural patterns and analysis |
| [aegis_project_status_report.md](./aegis_project_status_report.md) | Component status and development roadmap |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Desktop UI | HTML5 + Vanilla CSS + Vanilla JS |
| Python Server | Python 3.10+ + llama-cpp-python |
| Runtime Kernel | Node.js 20+ + TypeScript (ESM) |
| Build Tool | tsx (TypeScript Execute) |
| Native Engine | C++20 (CMake 3.15+) |
| C++ Networking | Raw TCP sockets |
| Package Management | npm workspaces |
| AI Providers | GGUF (local), Ollama (local), API (remote) |
| Memory Store | Filesystem (JSON + Markdown) |

---

## License

MIT — See [LICENSE](./LICENSE) for details.