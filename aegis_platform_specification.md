# AEGIS — Platform Specification
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

---

## 1. Platform Mission

AEGIS is an **Enterprise AI Operating System** — a software platform that provides a complete operating environment for running, managing, and orchestrating AI agents, models, tools, and distributed computing workloads.

It is not a single AI model. It is not a chat application. It is an operating layer where:
- AI agents run as managed **Engines** with full lifecycles
- Memory is a first-class, durable **subsystem**
- Tools, Skills, and Plugins are **hot-swappable capabilities**
- AI models are interchangeable **Providers**
- Distributed computing is managed by a **native C++20 runtime**

---

## 2. Platform Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│                                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  Desktop UI  │  │  REST API   │  │    CLI     │  │ Dashboard │  │
│  │  (Port 5001) │  │  (Port 3005)│  │  Terminal  │  │   (Web)   │  │
│  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
└─────────╪─────────────────╪───────────────╪────────────────╪────────┘
          │                 │               │                │
┌─────────╪─────────────────╪───────────────╪────────────────╪────────┐
│                          ENGINE LAYER                                │
│                                                                     │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Memory Engine  │  │  Agent Engine  │  │    REST API Engine   │  │
│  │   priority: 5   │  │  priority: 10  │  │     priority: 20     │  │
│  └────────┬────────┘  └───────┬────────┘  └──────────┬───────────┘  │
└───────────╪───────────────────╪────────────────────────╪────────────┘
            │                   │                        │
┌───────────╪───────────────────╪────────────────────────╪────────────┐
│                        RUNTIME KERNEL LAYER                          │
│                                                                     │
│  Bootloader · KernelAPI · EngineManager · EventBus                 │
│  ServiceRegistry · DI Container · IPC Server                        │
│  RuntimeExecutor · RuntimeSessionManager · CapabilityManager        │
│  MemoryGateway · WorkspaceManager · ConfigurationManager            │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────╪─────────────────────────────────┐
│                    DISTRIBUTED INTELLIGENCE LAYER (C++20)            │
│                                                                     │
│  DistributedRuntime · NodeRuntime · Discovery · Heartbeat            │
│  Membership · TCP Transport · MessageBus · EventDispatcher          │
│  ResourceManager · AI Runtime (AIR) · Distributed Inference (DIS)  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Platform Concepts

### 3.1 Engine

An `IEngine` is the fundamental unit of platform capability. Every major subsystem is an engine:

```typescript
interface IEngine {
  metadata: IEngineMetadata;    // id, displayName, version, dependencies, priority
  initialize(ctx): Promise<void>; // Setup, register services
  start(): Promise<void>;         // Begin operation
  pause(): Promise<void>;         // Suspend operation
  resume(): Promise<void>;        // Resume from pause
  health(): Promise<Report>;      // Health check
  reload(): Promise<void>;        // Hot-reload
  shutdown(): Promise<void>;      // Graceful stop
  dispose(): Promise<void>;       // Release resources
}
```

**Current Engines:**

| Engine | ID | Priority | Responsibilities |
|--------|-----|----------|-----------------|
| Memory Engine | `aegis-memory` | 5 | Registers MemoryGateway, MemoryManager, all memory services |
| AI Agent Engine | `aegis-agent` | 10 | Registers Agent, ProviderManager, ToolRegistry, SkillRegistry |
| REST API Engine | `aegis-api` | 20 | Starts HTTP server on :3005, handles all API endpoints |
| Distributed Intelligence Engine | `distributed-intelligence` | 5 | Manages C++20 die-service child process |

### 3.2 Provider

A Provider is a pluggable AI model backend:

```typescript
interface Provider {
  name: string;
  category: string;
  version: string;
  initialize(ctx: ProviderContext): Promise<void>;
  shutdown(): Promise<void>;
  checkAvailability(): Promise<boolean>;
  streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
  generate(prompt: string): Promise<string>;
}
```

**Current Providers:**

| Name | Category | Backend |
|------|----------|---------|
| `local/gguf` | local | Python llama-cpp-python server |
| `local/ollama` | local | Ollama local inference |
| `api/*` | api | Remote OpenAI-compatible APIs |
| `mock` | mock | Testing mock |

### 3.3 Tool

A Tool is a callable action available to the AI agent during inference:

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(input: any, context: ToolContext): Promise<string>;
}
```

**Built-in Tools:** FileTool, FolderTool, MemoryTool, PatientDataTool, SystemTool, TerminalTool, memory-read, memory-write, memory-delete

### 3.4 Skill

A Skill is a higher-order, multi-step workflow executed by the agent:

```typescript
interface Skill {
  name: string;
  description: string;
  execute(input: any, context: SkillContext): Promise<string>;
}
```

**Built-in Skills:** extract, format, generate, summarize, follow-up-recommendation, lifestyle-recommendation, patient-history-summarizer, patient-timeline-builder

### 3.5 Plugin

A Plugin extends the platform with background or cross-cutting functionality (analytics, monitoring, caching, etc.):

```typescript
interface Plugin {
  name: string;
  initialize(ctx: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}
```

**Available Plugin Slots:** analytics, auth, cache, encryption, logging, monitoring, notifications, persistence, synchronization, telemetry

### 3.6 Session

A Session is a persistent, isolated execution context for the AI agent:

- Each session has its own conversation history, goals, tasks, and memory
- Sessions are stored as filesystem directories under `memory/sessions/`
- Multiple sessions can exist; one is active at a time
- Sessions support: create, checkout (switch), rename, delete (to trash), restore from trash, snapshot

### 3.7 Workspace

The Workspace is the sandboxed filesystem path where the agent operates:

```
workspaceManager.getWorkspacePath() → c:\aegis\workspace\
```

All agent file operations are confined to this path.

---

## 4. Platform API

### 4.1 HTTP REST API (Port 3005)

Full API exposed by `ApiServer.ts`. Key endpoints:

**Session Management:**
- `GET /api/sessions` — list all sessions
- `POST /api/sessions` — create new session
- `POST /api/sessions/checkout` — switch active session
- `POST /api/sessions/rename` — rename session
- `POST /api/sessions/delete` — soft-delete session
- `GET /api/sessions/active` — get active session with metadata, state, history

**Chat:**
- `POST /api/chat` — send message, receive SSE stream of response

**Capabilities:**
- `GET /api/capabilities` — list tools, skills, plugins (active + available)
- `POST /api/capabilities/add` — dynamically add a capability
- `POST /api/capabilities/remove` — dynamically remove a capability

**Providers:**
- `GET /api/providers` — list providers and active provider
- `POST /api/providers/switch` — switch active AI provider

**Health:**
- `GET /api/health` — `{ status: 'HEALTHY', version: '1.0.0' }`
- `POST /api/shutdown` — graceful system shutdown

### 4.2 IPC Control Channel

Named pipe interface for management scripts:
- `node ipc-status.mjs` — system status
- `node ipc-engine-info.mjs` — engine details
- `node ipc-reload.mjs` — hot-reload engines

### 4.3 Local GGUF API (Port 5001)

Served by `apps/desktop/main.py`:
- `GET /api/gguf/lora/status` — LoRA attachment status
- `POST /api/gguf/chat` — streaming chat with GGUF model
- `POST /api/gguf/lora/config` — attach/detach LoRA adapter

---

## 5. Platform Configuration

### 5.1 Runtime Configuration (`runtime.json`)

```json
{
  "maxReasoningSteps": 5,
  "maxToolExecutions": 5,
  "streamResponses": true,
  "enableInterruptions": true
}
```

### 5.2 Engine Registry (`engines/<name>/engine.json`)

```json
{
  "id": "engine-id",
  "displayName": "Human Name",
  "version": "1.0.0",
  "kernelApiVersion": "1.0.0",
  "entrypoint": "dist/Engine.js",
  "dependencies": ["other-engine-id"],
  "priority": 10,
  "autoStart": true,
  "singleton": true,
  "permissions": ["fs:read", "fs:write"]
}
```

### 5.3 Environment Variables

| Variable | Purpose |
|----------|---------|
| `AEGIS_LOG_LEVEL` | Log verbosity (`info`, `debug`, `warn`, `error`) |
| `OPENAI_API_KEY` | OpenAI provider API key |

---

## 6. Platform Permissions Model

Engines and capabilities declare required permissions. The `SecurityManager` enforces them at runtime:

| Permission | Scope |
|-----------|-------|
| `fs:read` | Filesystem read within workspace |
| `fs:write` | Filesystem write within workspace |
| `net:listen` | Bind to network ports |
| `process:spawn` | Spawn child processes |
| `network:tcp` | Open TCP network connections |
| `*` | All permissions |

---

## 7. Platform Startup Sequence

```
1. node packages/aegis-runtime/src/daemon.ts
   │
2. Bootloader.boot()
   ├─ Phase 1: Hardware + OS detection
   ├─ Phase 2: Config + Logging + EventBus
   ├─ Phase 3: DI Container + ServiceRegistry
   ├─ Phase 4: Session/Storage recovery check
   └─ Phase 5: Engine discovery + init + start + IPC
   │
3. python apps/desktop/main.py
   ├─ Load GGUF model from disk
   ├─ Start static file server on :5001
   └─ Open desktop UI in browser (optional)
```

---

## 8. Capability Hot-Swap

All capabilities can be added, removed, or updated at runtime **without restart**:

```
POST /api/capabilities/add { "type": "tool", "name": "MyTool" }
  → CapabilityManager.add(TOOL, "shared/MyTool")
  → loads + registers tool dynamically
  → persists to autoload config
  → emits: capability_added

POST /api/capabilities/remove { "type": "tool", "name": "MyTool" }
  → CapabilityManager.remove(TOOL, "shared/MyTool")
  → unregisters tool
  → persists to autoload config
  → emits: capability_removed
```

---

## 9. Distributed Computing (DIE)

The `distributed-intelligence` engine provides distributed node management:

- **Node discovery**: Automatic peer discovery via UDP/TCP broadcast
- **Heartbeat**: Periodic node liveness signals
- **Membership**: Track cluster membership state
- **Message bus**: Cross-node message routing
- **Resource monitoring**: CPU/RAM/GPU metrics per node
- **AI Runtime (AIR)**: Agent scheduling across nodes
- **Distributed Inference (DIS)**: Spread inference workloads across nodes

The C++ runtime is managed as a child process by the TypeScript adapter, communicating via IPC.

---

## 10. Domain Application: Clinical AI

While the AEGIS platform is domain-agnostic, its current tooling and GGUF provider configuration is applied to clinical medicine:

- **GGUF Model**: Local medical LLM loaded via llama-cpp-python
- **LoRA Adapters**: Domain-specific fine-tunes for clinical tasks
- **Skills**: Patient history summarization, timeline building, follow-up recommendations, lifestyle advice
- **Tools**: PatientDataTool for structured clinical data extraction
- **System Prompt**: Configured as "Aegis Core Agent, a helpful clinical medical assistant"

This domain layer is fully swappable — changing the system prompt, tools, and skills re-targets AEGIS to any domain.

---

## 11. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop UI | HTML5 + Vanilla CSS + Vanilla JS | — |
| UI Typography | Inter (Google Fonts) | Variable |
| Python Server | Python 3.x | 3.10+ |
| GGUF Runtime | llama-cpp-python | Latest |
| Runtime Kernel | Node.js + TypeScript (ESM) | Node 20+ |
| TypeScript Compiler | tsx (TypeScript Execute) | Latest |
| Native Engine | C++20 | GCC 11+ / MSVC 2022+ |
| Build System | CMake | 3.15+ |
| Package Manager | npm workspaces | npm 8+ |
| Monorepo Root | npm | — |
