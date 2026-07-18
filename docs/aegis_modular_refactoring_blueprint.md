# AEGIS — Modular Refactoring Blueprint
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

> **Note:** This document captures the completed modular refactoring of AEGIS and the current modular state of each component.

---

## 1. Refactoring Goals (Achieved)

The original AEGIS codebase was a monolithic agent script. The refactoring goals were:

- [x] Separate runtime kernel from agent logic
- [x] Extract memory into an independent engine
- [x] Extract AI agent into an independent engine
- [x] Extract API server into an independent engine
- [x] Create a typed SDK (`@aegis/sdk`) shared across all packages
- [x] Build a provider abstraction layer for AI models
- [x] Implement a capability hot-swap system for tools/skills/plugins
- [x] Build a session lifecycle management system
- [x] Introduce a native C++20 runtime for distributed capabilities
- [x] Create a desktop UI decoupled from the runtime via REST/SSE

---

## 2. Module Map

### 2.1 `@aegis/sdk` — Shared Interface Package

**Location:** `packages/aegis-sdk/src/`

**Purpose:** Single source of truth for all cross-package interfaces and types.

```
packages/aegis-sdk/src/
├── api/              # KernelAPI interfaces
├── context/          # IRuntimeContext_v1
├── logging/          # Logger interfaces
├── types/            # EngineHealthReport, KernelStatus, etc.
└── index.ts          # All exports
```

**Key exports:**
- `IEngine` — Engine contract
- `IEngineMetadata` — Engine descriptor
- `IRuntimeContext_v1` — Context passed to engines on init
- `IKernelAPI_v1` — Kernel API surface
- `EngineHealthReport` — Health report type
- `KernelStatus` — `'INITIALIZING' | 'ACTIVE' | 'SHUTTING_DOWN' | 'SAFE_MODE'`
- `SessionLifecycleState`, `MemoryLifecycleState`, `RuntimeHealthStatus`
- `SessionMetadata`, `SessionState`, `MemoryQuotas`

**Rule:** No business logic in `@aegis/sdk`. Interfaces and types only.

### 2.2 `@aegis/runtime` — Runtime Kernel

**Location:** `packages/aegis-runtime/src/`

**Purpose:** Boot, orchestration, session management, event bus, service registry.

```
packages/aegis-runtime/src/
├── boot/         # Bootloader.ts, KernelAPI
├── managers/     # EngineManager.ts
├── services/     # RuntimeExecutor, SessionManager, CapabilityManager, ...
├── eventbus/     # EventBus, EventTypes (100+ events)
├── registry/     # ServiceRegistry, RegistryLoader
├── di/           # Container
├── transports/   # IpcServer, IpcProtocol
├── config/       # ConfigurationManager
├── workspace/    # WorkspaceManager
├── logging/      # StructuredLogger
├── types/        # Message, Tool, Command, Runtime
└── utils/        # environment, platform, checksums, path sandbox
```

**Key exports:**
- `Bootloader` — boot entry point
- `KernelAPI` — kernel control surface
- `EngineManager` — engine lifecycle
- `RuntimeExecutor` — ReAct agent loop
- `RuntimeSessionManager` — session lifecycle
- `CapabilityManager` — dynamic capability management
- `eventBus` — global event bus singleton
- `serviceRegistry` — global service locator
- `workspaceManager` — sandboxed path resolver
- `RUNTIME_VERSION` — `"1.0.0"`

**Dependency rule:** `@aegis/runtime` may import `@aegis/sdk` but nothing else from AEGIS packages.

### 2.3 `@aegis/memory` — Cognitive Memory Engine

**Location:** `packages/aegis-memory/src/`

**Purpose:** Session-scoped persistent memory with integrity, transactions, projections.

```
packages/aegis-memory/src/
├── MemoryGateway.ts      # Primary I/O (all reads/writes)
├── MemoryManager.ts      # High-level orchestration
├── MemoryEngine.ts       # IEngine implementation
├── MemoryWriteBuffer.ts  # Write coalescing (5s debounce)
├── ProjectionGenerator.ts # Prompt injection projections
├── contracts/            # Permission + validation contracts
├── embedding/            # Vector embedding
├── eventbus/             # MemoryEventBus
├── indexing/             # Search indexes
├── interfaces/           # IMemoryGateway, MemoryTypes
├── locking/              # Distributed locks
├── migration/            # Schema migrations
├── recovery/             # Corruption recovery
├── refinement/           # Memory compression
├── search/               # Query engine
├── transactions/         # ACID-like transactions
└── utils/                # File helpers, observability
```

**Dependency rule:** `@aegis/memory` imports `@aegis/sdk` and `@aegis/runtime`. No upward imports.

### 2.4 `@aegis/agent` — AI Agent Engine

**Location:** `packages/aegis-agent/src/`

**Purpose:** AI reasoning loop, prompt building, message formatting.

```
packages/aegis-agent/src/
├── AgentEngine.ts    # IEngine — registers agent services
├── Agent.ts          # Core agent instance
├── PromptBuilder.ts  # System prompt + memory assembly
├── MessageFormatter.ts # Message normalization
└── index.ts
```

**Dependency rule:** `@aegis/agent` imports `@aegis/sdk`, `@aegis/runtime`, `@aegis/providers`, `@aegis/tools`, `@aegis/skills`.

### 2.5 `@aegis/providers` — AI Model Provider Abstraction

**Location:** `packages/aegis-providers/src/`

**Purpose:** Pluggable AI model backends.

```
packages/aegis-providers/src/
├── Provider interface + ProviderManager
├── ProviderRegistry
└── ProviderContext
```

**Provider implementations:**
- `providers/local/gguf/index.ts` — GGUFProvider (Python bridge)
- `providers/local/ollama/` — OllamaProvider
- `providers/api/` — Remote API providers
- `providers/mock/` — Testing mock

**Dependency rule:** `@aegis/providers` imports `@aegis/sdk` and `@aegis/runtime` only.

### 2.6 `@aegis/tools` — Tool Registry & Loader

**Location:** `packages/aegis-tools/src/`

**Purpose:** Tool registry, loader, and all built-in tools.

**Built-in tools** (`tools/shared/`):
- `FileTool` — read/write files
- `FolderTool` — list/create directories
- `MemoryTool` — direct memory access
- `PatientDataTool` — clinical data extraction
- `SystemTool` — OS info
- `TerminalTool` — shell execution
- `memory-read` — structured memory read
- `memory-write` — structured memory write
- `memory-delete` — memory entry deletion

**Dependency rule:** `@aegis/tools` imports `@aegis/sdk` and `@aegis/runtime`.

### 2.7 `@aegis/skills` — Skill Registry & Loader

**Location:** `packages/aegis-skills/src/`

**Purpose:** Skill registry and all built-in skills.

**Built-in skills** (`skills/shared/`):
- `extract`, `format`, `generate`, `summarize`
- `follow-up-recommendation`, `lifestyle-recommendation`
- `patient-history-summarizer`, `patient-timeline-builder`

### 2.8 `@aegis/plugins` — Plugin System

**Location:** `packages/aegis-plugins/src/`

**Purpose:** Plugin registry, loader, and available plugin slots.

**Plugin slots** (`plugins/shared/`):
- analytics, auth, cache, encryption, logging, monitoring, notifications, persistence, synchronization, telemetry

### 2.9 `@aegis/distributed-intelligence` — Native C++20 Engine

**Location:** `packages/aegis-distributed-intelligence/`

**Purpose:** C++20 native runtime for distributed computing.

**TypeScript side** (`src/`):
- Engine adapter (IEngine implementation)
- Lifecycle manager for C++ process
- Health monitor, state machine, IPC

**C++ side** (`cpp/`):
- 16+ C++ subsystems (node, discovery, heartbeat, membership, transport, etc.)
- AI Runtime (AIR)
- Distributed Inference Service (DIS)
- Resource Manager

**Dependency rule:** TS adapter imports `@aegis/sdk` and `@aegis/runtime`. C++ is self-contained.

### 2.10 `@aegis/package-manager` — Capability Package Manager

**Location:** `packages/aegis-package-manager/`

**Purpose:** Install, update, remove capability packages (tools/skills/plugins) with atomic transactions and rollback.

---

## 3. Engine Dependency Graph

```
@aegis/sdk (no dependencies)
    │
    ▼
@aegis/runtime (imports sdk)
    │
    ├─► @aegis/memory (imports sdk + runtime) ─────┐
    │                                               │
    ├─► @aegis/providers (imports sdk + runtime)    │
    │                                               │
    ├─► @aegis/tools (imports sdk + runtime)        │
    │                                               │
    ├─► @aegis/skills (imports sdk + runtime)       │
    │                                               │
    ├─► @aegis/plugins (imports sdk + runtime)      │
    │                                               │
    └─► @aegis/agent (imports sdk + runtime         │
                     + providers + tools + skills)  │
         │                                          │
         ▼                                          │
    (engines/ directory)                            │
    aegis-memory (priority 5) ◄─────────────────────┘
    aegis-agent  (priority 10) ← depends on aegis-memory
    aegis-api    (priority 20) ← depends on aegis-agent + aegis-memory

    distributed-intelligence (priority 5, independent)
```

---

## 4. Package Boundary Rules

| Rule | Enforcement |
|------|-------------|
| No circular dependencies | Package.json dependency declarations |
| SDK has no runtime imports | Lint / manual review |
| Runtime has no agent/memory imports | ServiceRegistry lazy resolution pattern |
| Engines register via ServiceRegistry | No direct import between engine packages |
| Capabilities hot-swappable | CapabilityManager loads dynamically, no static import |

### 4.1 The ServiceRegistry Decoupling Pattern

Rather than having `@aegis/runtime` import `@aegis/memory`, the memory engine registers itself:

```typescript
// In MemoryEngine.initialize():
serviceRegistry.register('memoryGateway', memoryGateway);

// In RuntimeExecutor (runtime package):
const getMemoryGateway = () => serviceRegistry.get<any>('memoryGateway');
// Called only when needed (lazy resolution)
```

This allows `@aegis/runtime` to reference memory services without a compile-time import of `@aegis/memory`.

---

## 5. File Naming Conventions

| Convention | Example |
|-----------|---------|
| Engine class file | `MemoryEngine.ts`, `AgentEngine.ts` |
| Manager class file | `EngineManager.ts`, `CapabilityManager.ts` |
| Gateway class file | `MemoryGateway.ts` |
| Interface file | `IMemoryGateway.ts`, `IEngine.ts` |
| Types file | `MemoryTypes.ts`, `EventTypes.ts` |
| Singleton export | `export const memoryGateway = new MemoryGateway()` |
| Engine descriptor | `engine.json` |
| Engine manifest (DIE) | `manifest.json` |

---

## 6. Modular Refactoring Status

| Component | Before Refactoring | After Refactoring |
|-----------|-------------------|-------------------|
| Runtime | Mixed with agent code in single file | Separate `@aegis/runtime` package |
| Agent | Embedded in runtime | Separate `@aegis/agent` engine |
| Memory | Flat JSON files | Full `@aegis/memory` engine with 20+ modules |
| Providers | Hardcoded Ollama calls | Pluggable `@aegis/providers` abstraction |
| Tools | Inline in agent | `@aegis/tools` with dynamic registry |
| Skills | None | `@aegis/skills` with 8 built-in skills |
| Plugins | None | `@aegis/plugins` with 10 plugin slots |
| API | Mixed with runtime | Separate `aegis-api` engine |
| Distributed | None | Full C++20 DIE with 16+ subsystems |
| UI | None | Full desktop SPA + Python bridge |
