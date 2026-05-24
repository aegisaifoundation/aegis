# AEGIS Core Kernel (`aegis-core`)

Welcome to the **AEGIS Core** kernel directory. This is the main orchestration engine, runtime system, and kernel for the AEGIS Decentralized Federated Medical AI CLI application.

---

## 💡 What is AEGIS Core?

The `aegis-core` package forms the brain of the AEGIS runtime environment. It bootstraps the system, initializes memory, manages capabilities (Tools, Commands, Plugins, and Skills), sets up model providers, and drives the conversational agent planning/reasoning loops.

It acts as a secure, sandboxed shell that connects:
1.  **AI Orchestration (Agent Executor)**: Runs the ReAct-style reason-act-observe loops.
2.  **Capability Management**: Integrates custom Tools, Plugins, Commands, and Skills.
3.  **Local Memory**: Persists conversation context and handles localized vector embeddings.
4.  **Local LLM Integration**: Interfaces with local model providers (like Ollama).

---

## 📁 Source Code Directory Structure

The core modules are organized under [src/](file:///c:/aegis/aegis-core/src/):

```
aegis-core/
├── package.json         # Node.js dependencies and build scripts
├── tsconfig.json        # TypeScript compile parameters
├── src/
│   ├── index.ts         # Boot entrypoint
│   ├── agent/           # ReAct execution loop, reasoning, planning logic
│   ├── runtime/         # BootstrapManager, EventBus, CapabilityManager
│   ├── config/          # ConfigurationManager & runtime.json configurations
│   ├── commands/        # CLI CommandLoader, registries, slash command abstractions
│   ├── plugins/         # Plugin registries, loading utilities, state controllers
│   ├── skills/          # Skill registries, loader, context definitions
│   ├── tools/           # Tool registries, execution engines, and sandboxes
│   ├── models/          # ModelHandler & LLM provider abstraction APIs
│   ├── memory/          # Session memory manager, DB hooks, vector DB interfaces
│   ├── context/         # Execution context scopes
│   ├── transports/      # Transport bindings and RPC communications
│   └── utils/           # Shared helper functions
```

---

## 🛠️ Developer Operations

### Prerequisites
Make sure you have Node.js (v18+) and npm installed.

### 1. Install Dependencies
Run the following command in the `aegis-core/` directory:
```bash
npm install
```

### 2. Build the Core Package
Compile the TypeScript source files to JavaScript (`dist/` directory):
```bash
npm run build
```

### 3. Run in Dev Mode (Hot Reloading/TSX)
Launch the AEGIS terminal runtime in dev mode with live TypeScript compilation:
```bash
npm run dev
```

### 4. Run the Skill Integration Test Suite
Execute the programmatic integration tests for the Skill system:
```bash
node --import tsx test_skills.ts
```
