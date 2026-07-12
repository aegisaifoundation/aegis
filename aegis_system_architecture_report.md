# AEGIS — System Architecture Report
**Version:** 1.0.0 | **Last Updated:** 2026-07-12 | **Status:** Active Development

---

## 1. Executive Summary

**AEGIS** (Advanced Enterprise General Intelligence System) is a full-stack, privacy-preserving AI platform engineered as an enterprise operating system for distributed AI workloads. It is domain-applied to clinical/medical use cases via its local GGUF model integration and medical tooling, but the architecture is entirely domain-agnostic and extensible.

The system is structured in three clear layers:

```
┌─────────────────────────────────────────────────────┐
│              User Interfaces (Apps Layer)            │
│   Desktop UI · CLI Terminal · REST API · Dashboard  │
├─────────────────────────────────────────────────────┤
│     TypeScript Runtime Kernel (Orchestration Layer) │
│  Bootloader · Engines · Memory · Sessions · Events  │
├─────────────────────────────────────────────────────┤
│    C++20 Distributed Intelligence Runtime (DIE)     │
│  Node · Discovery · Transport · AIR · DIS · Resources│
└─────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Directory Structure

AEGIS is a **Node.js + C++20 monorepo** organized under npm workspaces.

```text
aegis/                                        # Root monorepo
├── package.json                              # npm workspaces: apps/* + packages/*
├── package-lock.json
├── install.ps1                               # Windows automated install script
├── install-die.mjs                           # DIE (C++ binary) install helper
├── register-default-engines.mjs             # Engine registry bootstrapper
├── ipc-status.mjs                           # IPC control channel status checker
├── ipc-engine-info.mjs                      # IPC engine info query tool
├── ipc-reload.mjs                           # IPC hot-reload trigger
├── scratch_boot_runtime.ts                  # Boot test scratch file
├── testBoot.ts                              # Boot integration test entry
│
├── apps/                                    # User-facing application layer
│   ├── desktop/                             # Primary desktop UI (HTML/CSS/JS + Python server)
│   │   ├── index.html                       # Main SPA shell (3-column layout)
│   │   ├── app.js                           # All UI logic, event handling, API calls
│   │   ├── style.css                        # Full UI design system & animations
│   │   └── main.py                          # Python HTTP server + GGUF model bridge
│   ├── aegis-boot/                          # Boot application (launcher)
│   ├── aegis-builder/                       # Build tooling app
│   ├── aegis-cli/                           # Command-line interface app
│   ├── aegis-installer/                     # Installer application
│   ├── dashboard/                           # Admin/analytics dashboard
│   └── terminal/                           # Terminal UI (React/CLI)
│
├── packages/                               # Core packages (npm workspaces)
│   ├── aegis-sdk/                          # Shared interfaces & type contracts
│   ├── aegis-runtime/                      # TypeScript Runtime Kernel
│   ├── aegis-agent/                        # AI Agent Engine
│   ├── aegis-memory/                       # Cognitive Memory System
│   ├── aegis-distributed-intelligence/     # DIE: C++20 native engine + TypeScript adapter
│   ├── aegis-api/                          # REST API connector engine
│   ├── aegis-providers/                    # AI model provider abstraction
│   ├── aegis-tools/                        # Tool registry & loader
│   ├── aegis-skills/                       # Skill registry & loader
│   ├── aegis-plugins/                      # Plugin registry & loader
│   └── aegis-package-manager/              # Capability package manager
│
├── engines/                                # Engine registry entries (engine.json descriptors)
│   ├── aegis-memory/engine.json            # Memory Engine descriptor
│   ├── aegis-agent/engine.json             # AI Agent Engine descriptor
│   └── aegis-api/engine.json              # REST API Engine descriptor
│
├── providers/                              # AI model providers
│   ├── local/
│   │   ├── gguf/index.ts                   # Local GGUF model provider (via Python server)
│   │   └── ollama/                         # Ollama local provider
│   ├── api/                                # Remote API providers (OpenAI, etc.)
│   └── mock/                               # Mock provider for testing
│
├── tools/shared/                           # Built-in tools
│   ├── FileTool/                           # File read/write operations
│   ├── FolderTool/                         # Directory management
│   ├── MemoryTool/                         # Direct memory access tool
│   ├── PatientDataTool/                    # Clinical data extraction tool
│   ├── SystemTool/                         # OS/system info tool
│   ├── TerminalTool/                       # Shell command execution tool
│   ├── memory-read/                        # Structured memory read
│   ├── memory-write/                       # Structured memory write
│   └── memory-delete/                      # Memory entry deletion
│
├── skills/shared/                          # Built-in skills (higher-order workflows)
│   ├── extract/                            # Data extraction skill
│   ├── format/                             # Output formatting skill
│   ├── generate/                           # Content generation skill
│   ├── summarize/                          # Summarization skill
│   ├── follow-up-recommendation/           # Clinical follow-up skill
│   ├── lifestyle-recommendation/           # Lifestyle advice skill
│   ├── patient-history-summarizer/         # Patient history skill
│   └── patient-timeline-builder/           # Clinical timeline skill
│
├── plugins/shared/                         # System plugins
│   ├── analytics/                          # Usage analytics plugin
│   ├── auth/                               # Authentication plugin
│   ├── cache/                              # Caching plugin
│   ├── encryption/                         # Encryption plugin
│   ├── logging/                            # Extended logging plugin
│   ├── monitoring/                         # Health monitoring plugin
│   ├── notifications/                      # Notification plugin
│   ├── persistence/                        # Persistence plugin
│   ├── synchronization/                    # Data sync plugin
│   └── telemetry/                          # Telemetry plugin
│
├── memory/                                 # Runtime memory store (filesystem)
│   ├── sessions/                           # Session memory directories
│   │   ├── default/
│   │   └── session_<timestamp>/
│   │       ├── metadata.json              # Session metadata & checksums
│   │       ├── history.json              # Conversation history
│   │       ├── session-state.json        # Objective, tasks, facts
│   │       ├── session-memory.md         # Long-term session memory
│   │       ├── working-memory.md         # Current turn working memory
│   │       └── task.md                   # Active task tracking
│   ├── trash/                             # Soft-deleted sessions
│   ├── quarantine/                        # Corrupted session recovery zone
│   ├── snapshots/                         # Session snapshots
│   ├── episodic/                          # Episodic memory store
│   ├── indexes/                           # Memory search indexes
│   ├── persistence/                       # Persistence layer
│   └── profile/                           # User profile memory
│
├── runtime/                               # Runtime state persistence
│   └── checkpoints/                       # Recovery checkpoint files
│
├── workspace/                             # Active workspace root (agent sandbox)
│   └── engines/                           # Workspace-scoped engine configs
│
├── logs/                                  # Structured runtime logs
├── sessions/                              # Active session pointers
├── schemas/                               # JSON schemas for validation
├── generated/                             # Code generation outputs
├── reports/                               # Runtime reports
└── tests/                                 # Integration & unit tests
```

---

## 3. System Architecture Layers

### 3.1 Layer Overview

```
╔═══════════════════════════════════════════════════════════════════╗
║                    LAYER 4: USER INTERFACES                       ║
║  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────┐ ║
║  │  Desktop UI  │  │  REST API  │  │  CLI Terminal │  │ Dash.  │ ║
║  │ (HTML/JS/Py) │  │ (Port 3005)│  │  (Node.js)   │  │ (Web)  │ ║
║  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘  └───┬────┘ ║
╠═════════╪════════════════╪═════════════════╪═══════════════╪══════╣
║         │                │                 │               │      ║
║                    LAYER 3: ENGINE LAYER                          ║
║  ┌────────────────┐  ┌───────────────┐  ┌──────────────────┐     ║
║  │  Memory Engine │  │ AI Agent Eng. │  │  REST API Engine  │     ║
║  │  (priority: 5) │  │ (priority: 10)│  │  (priority: 20)  │     ║
║  └────────┬───────┘  └───────┬───────┘  └────────┬─────────┘     ║
╠═══════════╪══════════════════╪════════════════════╪═══════════════╣
║           │                  │                    │               ║
║                    LAYER 2: RUNTIME KERNEL                        ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │ Bootloader → EngineManager → EventBus → ServiceRegistry   │   ║
║  │ RuntimeExecutor → SessionManager → CapabilityManager      │   ║
║  │ MemoryGateway → IPC Server → DI Container                 │   ║
║  └──────────────────────────┬─────────────────────────────────┘   ║
╠════════════════════════════╪═══════════════════════════════════════╣
║                            │                                       ║
║                    LAYER 1: NATIVE C++20 RUNTIME (DIE)            ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │ DistributedRuntime → NodeRuntime → Discovery → Heartbeat   │   ║
║  │ Membership → Transport → AIRuntime (AIR) → DIS (Inference) │   ║
║  │ ResourceManager → MessageBus → EventDispatcher             │   ║
║  └─────────────────────────────────────────────────────────────┘   ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 4. Runtime Kernel (TypeScript) — Deep Dive

### 4.1 Boot Sequence

The `Bootloader` in `packages/aegis-runtime/src/boot/Bootloader.ts` implements a **5-phase** startup sequence:

```
Phase 1: Environment & Platform Detection
  └─ Hardware detection (CPU/RAM/CUDA)
  └─ OS & architecture detection
  └─ Workspace path resolution

Phase 2: Configuration & Logging
  └─ ConfigurationManager loads runtime.json
  └─ Secret loading (OPENAI_API_KEY, etc.)
  └─ StructuredLogger initialized
  └─ EventBus initialized

Phase 3: Dependency Injection Services
  └─ Container created
  └─ KernelAPI bound
  └─ EventBus, Logger, WorkspaceManager bound
  └─ EngineManager bound
  └─ ConversationContext wired to MemoryGateway
  └─ ServiceRegistry populated

Phase 4: Session & Storage Recovery
  └─ Runtime state validated
  └─ Session recovery checks
  └─ Memory directories created

Phase 5: Ready State & Engine Loading
  └─ EngineManager.discoverAndLoad() scans engines/ directory
  └─ initializeAll() in dependency order
  └─ startAll() for autoStart engines
  └─ IPC Server started for control channel
  └─ KernelAPI.status → 'ACTIVE'
```

### 4.2 Engine Manager

`EngineManager` implements a **topological sort** for dependency-ordered loading:

```typescript
// Dependency resolution uses DFS with cycle detection
getLoadOrder(): string[]
  → ENGN-4001: Missing dependency
  → ENGN-4002: Circular dependency detected

// Lifecycle operations
discoverAndLoad(context)  → scans engines/ via RegistryLoader
initializeAll(context)   → calls engine.initialize() in order
startAll()              → calls engine.start() for autoStart=true engines
shutdownAll()          → reverse order shutdown
reload()               → hot-reload all engines (stop → clear → rediscover → start)
reloadEngine(id)       → hot-reload single engine by ID
```

**Engine Registry** (`engines/` directory):

| Engine ID | Display Name | Priority | Dependencies |
|-----------|-------------|----------|-------------|
| `aegis-memory` | Cognitive Memory Engine | 5 | none |
| `aegis-agent` | AI Agent Engine | 10 | aegis-memory |
| `aegis-api` | REST API Connector Engine | 20 | aegis-agent, aegis-memory |

### 4.3 Service Registry

A lightweight singleton map (`ServiceRegistry`) that acts as the system's IoC locator:

```
ServiceRegistry
├── eventBus          → EventBus singleton
├── workspaceManager  → WorkspaceManager singleton
├── config            → ConfigurationManager singleton
├── kernelAPI         → KernelAPI instance
├── engineManager     → EngineManager singleton
├── memoryGateway     → MemoryGateway singleton (registered by MemoryEngine)
├── memoryManager     → MemoryManager singleton
├── conversationContext → ConversationContext wrapper
├── providerManager   → ProviderManager (registered by AgentEngine)
├── agent             → Agent instance
├── toolRegistry      → ToolRegistry singleton
├── skillRegistry     → SkillRegistry singleton
└── pluginRegistry    → PluginRegistry singleton
```

---

## 5. AI Agent Engine

### 5.1 Agent Engine Structure

Located in `packages/aegis-agent/src/`:

```
packages/aegis-agent/src/
├── AgentEngine.ts    # IEngine implementation — registers agent, tools, skills, providers
├── Agent.ts          # Agent singleton — orchestrates chat generation
├── PromptBuilder.ts  # Assembles system prompt with memory projections
├── MessageFormatter.ts # Normalizes message history & working memory
└── index.ts          # Package exports
```

### 5.2 RuntimeExecutor — The ReAct Loop

`packages/aegis-runtime/src/services/RuntimeExecutor.ts` implements the main agent execution loop:

```
User Input
    │
    ▼
[ Provider Check ] → local/gguf? → Direct GGUF streaming (bypasses ReAct)
    │
    ▼
[ Task Classification ] → isTaskAssignment() detects action keywords
    │
    ▼
[ Session ID Cache ]
    │
    ▼
[ ReAct Loop ] (max 5 reasoning steps, max 5 tool executions)
    │
    ├─ emit: execution_started
    ├─ emit: message_received
    ├─ emit: thinking_started
    │
    ├─ Agent.think() → builds prompt with memory context
    ├─ Provider.streamChat() → streams tokens
    ├─ emit: response_chunk (each token)
    │
    ├─ ToolParser.parse() → detects tool call in response
    ├─ Tool.execute() → runs tool
    ├─ emit: tool_started / tool_finished
    │
    └─ Repeat until no tool call OR maxSteps reached
    │
    ▼
[ Post-Turn ]
    ├─ SessionStateManager.updateFromTurn() → update goals/tasks/facts
    ├─ ConversationContext.addMessage() → persist to history
    ├─ MemoryGateway.flushHistory() → write to disk
    └─ emit: execution_completed
```

---

## 6. Cognitive Memory System

### 6.1 Memory Architecture

Located in `packages/aegis-memory/src/`:

```
packages/aegis-memory/src/
├── MemoryGateway.ts          # Primary I/O interface — session CRUD + history + state
├── MemoryManager.ts          # High-level memory orchestration
├── MemoryEngine.ts           # IEngine implementation — registers all memory services
├── MemoryWriteBuffer.ts      # Write coalescing / debounced flush buffer
├── ProjectionGenerator.ts    # Generates working/session memory markdown projections
├── ProjectionConsistencyValidator.ts # Validates projection integrity
├── SessionMemory.ts          # Session memory data model
├── Memory.ts                 # Core memory entity
├── MemoryLoader.ts           # Memory deserialization
├── MemoryRegistry.ts         # In-memory entity registry
├── contracts/                # Permission & validation contracts
├── embedding/                # Vector embedding subsystem
├── eventbus/                 # Memory-domain event bus
├── indexing/                 # Full-text & semantic search indexes
├── interfaces/               # TypeScript interfaces (MemoryTypes, IMemoryGateway)
├── locking/                  # Distributed lock management
├── migration/                # Schema migration tooling
├── recovery/                 # Corruption recovery procedures
├── refinement/               # Memory refinement & compression
├── registry/                 # Memory object registry
├── scheduler/                # Async memory task scheduler
├── search/                   # Search query engine
├── transactions/             # ACID-like memory transaction manager
└── utils/                    # File helpers, observability, checksums
```

### 6.2 Session Filesystem Layout

Each session is stored as a directory under `memory/sessions/<sessionId>/`:

```
session_1783876795565/
├── metadata.json        # { sessionId, createdAt, updatedAt, lifecycleState, checksums, quotas }
├── history.json         # { messages: [{ id, role, content, metadata, createdAt }], memoryVersion }
├── session-state.json   # { currentObjective, activeTasks, stableFacts, preferences }
├── session-memory.md    # Long-form semantic memory (goals, preferences, stable facts)
├── working-memory.md    # Current-turn short-term memory (tools, objectives, context)
└── task.md              # Active task checklist
```

### 6.3 Memory Lifecycle State Machine

```
CREATING → ACTIVE → ARCHIVED → TRASH → (permanently deleted)
                ↓
           QUARANTINED (corruption detected)
                ↓
           RECOVERED → ACTIVE
```

### 6.4 MemoryGateway Caching Strategy

```
MemoryGateway (Singleton)
├── metadataCache: Map<sessionId, SessionMetadata>   ← LRU in-memory cache
├── historyCache:  Map<sessionId, History>           ← Buffered write cache
├── historyDirty:  Set<sessionId>                   ← Dirty flag tracker
└── accessedSessions: Set<sessionId>                ← Debounced timestamp flush

Write Path:
  appendHistory() → historyCache + historyDirty
  flushHistory()  → write to disk (called at turn boundary)
  MemoryWriteBuffer.markDirty() → coalesced write with 5s auto-flush
```

### 6.5 Session Quotas

| Quota | Default Value |
|-------|--------------|
| maxSessions | 100 |
| maxHistorySize | 10 MB |
| maxWorkingMemorySize | 1,500 chars |
| maxSessionMemorySize | 1,000 chars |
| maxSnapshots | 10 |

---

## 7. Event Bus

### 7.1 EventBus Architecture

The `EventBus` (`packages/aegis-runtime/src/eventbus/EventBus.ts`) is a typed Node.js `EventEmitter` wrapper. All system events are defined in `EventTypes.ts`.

### 7.2 Event Taxonomy

| Category | Key Events |
|----------|-----------|
| **Execution** | `execution_started`, `execution_completed`, `thinking_started`, `thinking_finished`, `response_chunk`, `tool_started`, `tool_finished`, `runtime_error` |
| **Session** | `session.created`, `session.loaded`, `session.mounted`, `session.unmounted`, `session.deleted`, `session.renamed`, `session.restored`, `session.forked` |
| **Memory** | `memory.read`, `memory.updated`, `memory.deleted`, `memory.snapshot.created`, `memory.corrupted`, `memory.restored`, `memory.refined` |
| **Runtime Health** | `runtime.health.changed`, `runtime.crash.detected`, `runtime.safe_mode.entered`, `runtime.heartbeat.updated`, `runtime.heartbeat.stale` |
| **Capabilities** | `capability_added`, `capability_removed`, `capability_updated`, `capability_failed`, `capability_initialized` |
| **Packages** | `package.installing`, `package.installed`, `package.removed`, `package.transaction.started`, `package.transaction.committed` |

---

## 8. Distributed Intelligence Engine (DIE) — C++20 Native Runtime

### 8.1 Architecture

The DIE is a **standalone C++20 binary** (`die-service.exe`) managed by the TypeScript adapter (`DistributedIntelligenceEngine.ts`). It is launched as a child process.

```
TypeScript Adapter (DistributedIntelligenceEngine.ts)
    │ spawns
    ▼
die-service.exe / die-service
    │
    └─ DistributedRuntime (C++)
         ├─ NodeRuntime
         ├─ Discovery Manager
         ├─ Heartbeat Manager
         ├─ Membership Manager
         ├─ Message Bus
         ├─ TCP Transport
         ├─ Event Dispatcher
         ├─ Registry (Node/Service/Plugin/Topic)
         ├─ Resource Manager
         │   ├─ ResourceCollector (hardware telemetry)
         │   ├─ ResourcePublisher (broadcast metrics)
         │   ├─ ResourceCache (in-memory snapshot)
         │   ├─ ResourceMonitor (threshold alerts)
         │   ├─ ResourceSnapshot
         │   ├─ ResourceHistory
         │   └─ ResourceStatistics
         │
         ├─ AI Runtime (AIR) ← aegis::air namespace
         │   ├─ AgentRegistry
         │   ├─ AgentLifecycleManager
         │   ├─ AgentOrchestrator
         │   ├─ WorkflowEngine
         │   ├─ TaskSchedulerAdapter (bridges to DIR Scheduler)
         │   ├─ MemoryManager
         │   ├─ KnowledgeManager
         │   ├─ PromptManager
         │   ├─ ContextManager
         │   ├─ ToolRuntime
         │   ├─ AIServiceManager
         │   ├─ PolicyManager
         │   ├─ TrustManager
         │   ├─ ModelManager
         │   └─ AIRuntimeMetrics
         │
         └─ Distributed Inference Service (DIS) ← aegis::dis namespace
             ├─ InferenceSession
             ├─ SessionPool
             ├─ PromptBuilder
             ├─ ContextBuilder
             ├─ TokenStreamer
             └─ ResponseAssembler
```

### 8.2 C++ Module Build Graph (CMake)

```
die-common (INTERFACE)
    ├─ die-kernel (INTERFACE)
    ├─ die-identity (INTERFACE)
    ├─ die-capabilities (INTERFACE)
    ├─ die-resources (INTERFACE)
    ├─ die-roles (INTERFACE)
    ├─ die-state (INTERFACE)
    └─ die-lifecycle (STATIC: StateTransition.cpp, LifecycleManager.cpp)
         └─ used by → die-node (STATIC: Node.cpp)
                        └─ used by → die-runtime (STATIC: DistributedRuntime.cpp, NodeRuntime.cpp)

die-discovery (STATIC: DiscoveryManagerImpl.cpp)
die-heartbeat (STATIC: HeartbeatManagerImpl.cpp)
die-membership (STATIC: MembershipManagerImpl.cpp)
die-transport (STATIC: TcpTransport.cpp) → ws2_32 on Windows
die-events (STATIC: EventDispatcher.cpp)
die-messaging (STATIC: MessageBus.cpp)
die-registry (STATIC: RegistryImpls.cpp)
die-resource-manager (STATIC: ResourceManager.cpp + 7 sub-components)

die-runtime links: die-node, die-kernel, die-registry, die-messaging, die-transport, die-events

Executables:
  die-service → die-runtime + die-resource-manager
  die-tests   → die-runtime + all modules + test suites
```

### 8.3 TypeScript ↔ C++ Communication

The TypeScript adapter manages the C++ process lifecycle:

| Responsibility | TS Adapter |
|---------------|------------|
| Process spawn/kill | `EngineLifecycle.ts` |
| Health monitoring | `HealthMonitor` via `getHealthReport()` |
| State machine | `EngineState` FSM (INITIALIZING → ONLINE → PAUSED → OFFLINE) |
| Event forwarding | `runtimeEvent` → global `eventBus` |
| Restart policy | Supervisor with configurable restart count |
| Config delivery | `lifecycle.configure(config)` |

---

## 9. AI Provider System

### 9.1 Provider Architecture

```
ProviderManager
    │ manages
    ├─ local/gguf     → GGUFProvider (Python server bridge, Port 5001)
    ├─ local/ollama   → OllamaProvider (Ollama API)
    ├─ api/*          → Remote API providers
    └─ mock/*         → Mock providers for testing

Provider Interface:
  name: string
  category: string
  version: string
  initialize(context): Promise<void>
  shutdown(): Promise<void>
  checkAvailability(): Promise<boolean>
  streamChat(messages): AsyncGenerator<string>
  generate(prompt): Promise<string>
```

### 9.2 GGUF Provider (Local Inference)

The `GGUFProvider` bridges Node.js to a Python HTTP server running `llama-cpp-python`:

```
Node.js RuntimeExecutor
    │ HTTP POST /api/gguf/chat
    ▼
Python main.py (Port 5001)
    │
    ├─ GGUFModelManager
    │   ├─ Llama(model_path, lora_path, n_ctx=2048, n_threads=8)
    │   └─ create_chat_completion(messages, stream=True)
    │
    └─ Streaming response → token-by-token text/plain
```

**LoRA Management:**
- `GET /api/gguf/lora/status` → returns attached LoRA & available LoRA files
- `POST /api/gguf/lora/config` → attach/detach LoRA adapter at runtime

---

## 10. REST API Server

The `ApiServer.ts` in `workspace/engines/aegis-api/src/` exposes a full HTTP API on **Port 3005**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| POST | `/api/shutdown` | Graceful shutdown |
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| POST | `/api/sessions/checkout` | Switch active session |
| POST | `/api/sessions/rename` | Rename session |
| POST | `/api/sessions/delete` | Soft-delete session |
| GET | `/api/sessions/active` | Get active session details (metadata, state, history) |
| GET | `/api/trash` | List trashed sessions |
| POST | `/api/trash/restore` | Restore trashed session |
| POST | `/api/trash/delete` | Permanently delete from trash |
| POST | `/api/trash/empty` | Empty trash |
| GET | `/api/capabilities` | List tools, skills, plugins |
| POST | `/api/capabilities/add` | Add capability |
| POST | `/api/capabilities/remove` | Remove capability |
| GET | `/api/providers` | List providers |
| POST | `/api/providers/switch` | Switch active provider |
| POST | `/api/chat` | Chat (SSE streaming) |

**Chat SSE Events:**
```
event: execution_started    → { input }
event: message_received     → { role, content }
event: thinking_started     → {}
event: thinking_finished    → {}
event: response_chunk       → { chunk }
event: tool_started         → { toolName, input }
event: tool_finished        → { toolName, output }
event: runtime_error        → { error }
event: execution_completed  → {}
```

---

## 11. Desktop UI

### 11.1 UI Architecture

The desktop UI is a single-page application served by the Python HTTP server (`main.py`) on **Port 5001**:

```
Browser (Port 5001)                      Node.js Runtime (Port 3005)
┌──────────────────────────┐             ┌──────────────────────┐
│  index.html              │             │  ApiServer.ts        │
│  ├─ Left Sidebar         │  REST/SSE   │  /api/sessions       │
│  │   ├─ Session list     │◄──────────►│  /api/chat           │
│  │   ├─ Search bar       │             │  /api/capabilities   │
│  │   └─ System Console   │             │  /api/providers      │
│  ├─ Center: Chat Panel   │             └──────────────────────┘
│  │   ├─ Message history  │
│  │   ├─ Streaming output │             Python Server (Port 5001)
│  │   └─ Input box        │             ┌──────────────────────┐
│  └─ Right Panel          │  REST       │  main.py             │
│      ├─ Session metadata │◄──────────►│  /api/gguf/chat      │
│      ├─ Tools panel      │             │  /api/gguf/lora/...  │
│      ├─ Capabilities     │             └──────────────────────┘
│      └─ Provider selector│
└──────────────────────────┘
  app.js  ← All JavaScript logic
  style.css ← Full design system
```

### 11.2 UI Layout (3-Column)

```
┌──────────────────────────────────────────────────────────────────┐
│ LEFT SIDEBAR (280px)  │  CENTER PANEL (flex)  │  RIGHT PANEL     │
│                       │                       │  (320-360px)     │
│  [AEGIS logo]         │  Active Session Title  │  Session Info    │
│  [+ New Session]      │  "AEGIS Agent"         │  ─────────────  │
│                       │                       │  Session State   │
│  🔍 Search sessions   │  ┌─────────────────┐  │  ─────────────  │
│                       │  │ Message History │  │  Tools Panel    │
│  Sessions             │  │                 │  │  ─────────────  │
│  ─────────────        │  │ [user message]  │  │  Skills Panel   │
│  session_1            │  │ [agent reply]   │  │  ─────────────  │
│  session_2            │  │                 │  │  Plugins Panel  │
│  ...                  │  │ [streaming...]  │  │  ─────────────  │
│                       │  └─────────────────┘  │  Provider       │
│  System Console       │                       │  ─────────────  │
│  ─────────────        │  ┌─────────────────┐  │  LoRA Manager   │
│  🏠 Home              │  │ Input + Send    │  │                  │
│  📋 Sessions          │  └─────────────────┘  │                  │
│  🔧 Tools             │                       │                  │
│  🎓 Skills            │                       │                  │
│  🧩 Plugins           │                       │                  │
│  🤖 Providers         │                       │                  │
│  📦 Packages          │                       │                  │
│  🧠 Memory            │                       │                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. IPC Control Channel

The runtime exposes an IPC (Inter-Process Communication) server for management tooling:

```
IpcServer.ts → Unix socket / named pipe
    │
    ├─ ipc-status.mjs     → Query runtime status
    ├─ ipc-engine-info.mjs → Query engine metadata
    └─ ipc-reload.mjs     → Trigger hot-reload
```

---

## 13. Data Flow Diagrams

### 13.1 Chat Request Data Flow

```
User types message in Desktop UI
         │
         ▼
app.js: POST /api/chat → { message }
         │
         ▼
ApiServer.ts: validate → check IDLE → open SSE stream
         │
         ▼
RuntimeExecutor.execute(message)
         │
         ├─ ProviderManager.getActiveProviderName()
         │
         ├─ if 'local/gguf':
         │    └─ HTTP POST → Python main.py → GGUFModelManager → llama-cpp
         │         └─ stream text chunks → SSE response_chunk events
         │
         └─ else (normal agent):
              ├─ ConversationContext.addMessage(role='user', content)
              ├─ SessionStateManager.getState()
              ├─ MemoryGateway.getSessionState()
              ├─ ProjectionGenerator.generateProjection() → working-memory.md
              │
              ├─ [REACT LOOP max 5 iterations]
              │   ├─ PromptBuilder.build(state, memoryProjection, history)
              │   ├─ ProviderManager.streamChat(messages) → token stream
              │   ├─ SSE: response_chunk per token
              │   ├─ ToolParser.parse(response) → tool call detected?
              │   │   └─ yes → ToolRegistry.get(name).execute(input)
              │   │             └─ SSE: tool_started / tool_finished
              │   └─ repeat or break
              │
              ├─ SessionStateManager.updateFromTurn()
              ├─ MemoryGateway.flushHistory(sessionId)
              └─ SSE: execution_completed
```

### 13.2 Session Lifecycle Data Flow

```
POST /api/sessions                     POST /api/sessions/checkout
       │                                          │
       ▼                                          ▼
RuntimeSessionManager                   RuntimeSessionManager
  .createNewSession()                     .checkoutSession(sessionId)
       │                                          │
       ├─ MemoryGateway.createSession()          ├─ SessionMountManager.unmount(current)
       │   └─ mkdir memory/sessions/<id>/         ├─ SessionMountManager.mount(target)
       │   └─ write metadata.json                 │   ├─ RuntimeStateManager.setActiveSession()
       │   └─ write session-state.json            │   └─ load session history/state into cache
       └─ RuntimeStateManager.setActive()         └─ emit: runtime.session.changed
```

### 13.3 Memory Write Data Flow

```
Agent generates response with tool output
         │
         ▼
RuntimeExecutor (post-turn)
  ConversationContext.addMessage()
         │
         ▼
MemoryGateway.appendHistory(sessionId, message)
         │
         ├─ historyCache.get(sessionId).messages.push(message)
         └─ historyDirty.add(sessionId)
                  │
                  ▼ (at turn boundary)
MemoryGateway.flushHistory(sessionId)
         │
         ├─ writeMemoryFile(history.json, JSON.stringify(messages))
         └─ MemoryWriteBuffer.markDirty(metadata.json)
                  │
                  ▼ (5s auto-flush or explicit flush)
MemoryWriteBuffer.flush()
         └─ fs.writeFile(metadata.json)
```

### 13.4 Engine Load Data Flow

```
Bootloader.boot()
    │
    ▼
EngineManager.discoverAndLoad(context)
    │
    ├─ RegistryLoader.loadRegistry()
    │   ├─ scan engines/ directory
    │   ├─ read engine.json for each entry
    │   ├─ resolve entrypoint → import(dist/Engine.js)
    │   └─ validate manifest against schema
    │
    ├─ for each validated engine:
    │   └─ new engine.classRef() → register in this.engines
    │
    ▼
EngineManager.initializeAll(context)
    ├─ getLoadOrder() → topological sort (DFS)
    │   priority: aegis-memory(5) → aegis-agent(10) → aegis-api(20)
    │
    ├─ MemoryEngine.initialize() → registers MemoryGateway, MemoryManager in ServiceRegistry
    ├─ AgentEngine.initialize()  → registers ProviderManager, Agent, ToolRegistry, SkillRegistry
    └─ ApiEngine.initialize()    → registers ApiServer, starts HTTP listener on :3005
    │
    ▼
EngineManager.startAll()
    ├─ MemoryEngine.start()
    ├─ AgentEngine.start()
    └─ ApiEngine.start()
```

---

## 14. Capability System

### 14.1 Capability Types

| Type | Registry | Loader | Path |
|------|---------|--------|------|
| Tool | ToolRegistry | ToolLoader | `tools/shared/<name>/` |
| Skill | SkillRegistry | SkillLoader | `skills/shared/<name>/` |
| Plugin | PluginRegistry | PluginLoader | `plugins/shared/<name>/` |
| Provider | ProviderRegistry | ProviderLoader | `providers/<category>/<name>/` |

### 14.2 Dynamic Add/Remove

```
POST /api/capabilities/add { type: "tool", name: "FileTool" }
         │
         ▼
CapabilityManager.add(CapabilityType.TOOL, "shared/FileTool")
    ├─ emit: capability_autoload_started
    ├─ ToolLoader.loadTool("shared/FileTool")
    ├─ ToolRegistry.register(tool)
    ├─ ConfigurationManager.updateAutoloadTools('add', path)
    └─ emit: capability_added / capability_initialized
```

---

## 15. Runtime Session Management

### 15.1 SessionManager Responsibilities

`RuntimeSessionManager.ts` is the central orchestrator for session lifecycle:

```
RuntimeSessionManager
    ├─ initialize()           → create dirs, start heartbeat & watchdog
    ├─ createNewSession()     → creates session dir + metadata + checkout
    ├─ checkoutSession()      → mounts session (load state/history into cache)
    ├─ getActiveSession()     → reads active session ID from runtime state
    ├─ listSessions()         → reads all non-trashed session metadata
    ├─ renameSession()        → updates displayName in metadata.json
    ├─ deleteSession()        → moves session dir to memory/trash/
    ├─ resumeSession()        → restores from trash
    └─ forwardSession()       → creates snapshot + checkout new session
```

### 15.2 Health Validation

```
RuntimeHealthValidator.validateHealth()
    ├─ Check: runtimeState.json exists
    ├─ Check: active session dir exists
    ├─ Check: mount lease not expired (10 min lease)
    ├─ Check: heartbeat timestamp is fresh
    └─ If unhealthy → auto-renew lease / safe mode
```

### 15.3 Watchdog & Heartbeat

- **Heartbeat interval**: Updates `runtime.state.json` timestamp periodically
- **Watchdog interval**: Checks for stale heartbeat → emits `runtime.heartbeat.stale`
- **Mount lease**: 10-minute TTL ensures stale mounts are auto-released

---

## 16. Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Desktop UI | HTML5 + Vanilla CSS + Vanilla JS |
| UI Font | Inter (Google Fonts) |
| Python Server | Python 3.x + `http.server` + `llama-cpp-python` |
| Runtime Kernel | Node.js + TypeScript (ESM) |
| Build Tool | `tsx` (TypeScript Execute) |
| Native Engine | C++20 (CMake 3.15+) |
| C++ Networking | Raw TCP sockets (ws2_32 on Windows) |
| Package Management | npm workspaces (monorepo) |
| AI Providers | GGUF (local), Ollama (local), API (remote) |
| Memory Store | Filesystem (JSON + Markdown files) |
| IPC | Node.js named pipe / Unix socket |

---

## 17. Development Commands

```bash
# Start the full runtime daemon
node --import tsx --experimental-specifier-resolution=node \
     --no-warnings packages/aegis-runtime/src/daemon.ts

# Start the desktop UI
python apps/desktop/main.py

# Build C++ native engine
cd packages/aegis-distributed-intelligence
cmake -B build -S .
cmake --build build --config Release

# Register default engines (run once)
node register-default-engines.mjs

# Check IPC status
node ipc-status.mjs

# Query engine info
node ipc-engine-info.mjs

# Trigger hot-reload
node ipc-reload.mjs
```

---

## 18. Key Design Principles

1. **Engine-First Architecture**: Every major subsystem is an `IEngine` with a defined lifecycle (initialize → start → pause → resume → health → reload → shutdown → dispose).

2. **Event-Driven Communication**: All cross-component communication flows through the typed `EventBus`. No direct coupling between layers.

3. **Memory Immutability Pattern**: Session history is append-only. Deletion moves to trash (soft delete). Corruption moves to quarantine.

4. **Write Buffer Pattern**: All memory writes are coalesced through `MemoryWriteBuffer` to prevent excessive disk I/O during streaming.

5. **Dependency Injection**: The `Container` and `ServiceRegistry` decouple all service dependencies, enabling hot-reload and testability.

6. **Topological Engine Loading**: `EngineManager.getLoadOrder()` uses DFS to resolve engine dependencies, preventing circular loading.

7. **AI-Agnostic Core**: The Runtime Kernel has no AI logic. All intelligence lives in the Agent Engine and Provider layer, which are hot-swappable.

8. **Distributed-First Native Runtime**: The C++20 DIE is designed to run across multiple nodes. The TypeScript layer only manages its lifecycle.
