# AEGIS — Core Runtime Specification
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

---

## 1. Overview

The AEGIS Core Runtime is the TypeScript-based orchestration layer that boots, manages, and coordinates all engines, services, and subsystems. It lives in `packages/aegis-runtime/` and is the heart of the AEGIS platform.

---

## 2. Package Structure

```
packages/aegis-runtime/src/
├── daemon.ts                          # Entry point: calls Bootloader.boot()
├── index.ts                           # Public API exports
│
├── boot/
│   └── Bootloader.ts                  # 5-phase boot sequence + KernelAPI
│
├── managers/
│   └── EngineManager.ts               # Engine discovery, lifecycle, hot-reload
│
├── services/
│   ├── RuntimeExecutor.ts             # ReAct agent execution loop
│   ├── RuntimeSessionManager.ts       # Session orchestrator (create/checkout/delete)
│   ├── RuntimeStateManager.ts         # Runtime state file persistence
│   ├── SessionMountManager.ts         # Session mount/unmount + lease management
│   ├── SessionStateManager.ts         # Session objective/task/fact tracking
│   ├── SessionRecoveryManager.ts      # Quarantine + corruption recovery
│   ├── CapabilityManager.ts           # Dynamic tool/skill/plugin/provider management
│   ├── RuntimeHealthValidator.ts      # Startup + periodic health validation
│   ├── CheckpointManager.ts           # State checkpointing
│   ├── SecurityManager.ts             # Permission enforcement
│   ├── RuntimeSupervisorHooks.ts      # Lifecycle supervisor hooks
│   ├── RuntimeContinuityValidator.ts  # Continuity checks across boots
│   ├── SessionCompatibilityValidator.ts # Session schema compatibility
│   ├── SessionStateTransitionValidator.ts # FSM transition validation
│   ├── RuntimeSessionRegistry.ts      # In-memory session ID registry
│   ├── RuntimeState.ts                # Runtime state data types
│   └── ToolParser.ts                  # Tool call parser for agent responses
│
├── eventbus/
│   ├── EventBus.ts                    # EventEmitter wrapper (typed)
│   ├── EventTypes.ts                  # 100+ event type constants
│   ├── EventRegistry.ts               # Event metadata registry
│   ├── EventPayloads.ts               # Payload type definitions
│   └── index.ts
│
├── registry/
│   ├── ServiceRegistry.ts             # Global service locator
│   ├── RuntimeServices.ts             # Well-known service token constants
│   ├── RegistryLoader.ts              # Engine registry file scanner
│   ├── RegistryRecovery.ts            # Registry corruption recovery
│   └── types/EngineRegistry.ts        # Engine registry entry types
│
├── di/
│   └── Container.ts                   # DI container (bind/resolve)
│
├── config/
│   └── ConfigurationManager.ts        # Runtime config loader (runtime.json)
│
├── workspace/
│   └── WorkspaceManager.ts            # Sandbox path resolver
│
├── logging/
│   ├── logger.ts                      # Console logger
│   └── StructuredLogger.ts            # Structured tagged logger
│
├── transports/
│   ├── IpcServer.ts                   # IPC named pipe server
│   ├── IpcPath.ts                     # IPC path resolution
│   └── IpcProtocol.ts                 # IPC message protocol definition
│
├── commands/
│   └── index.ts                       # Built-in runtime commands
│
├── types/
│   ├── Message.ts                     # Chat message types
│   ├── Tool.ts                        # Tool interface + ToolContext
│   ├── Command.ts                     # Command interface
│   └── Runtime.ts                     # RuntimeStatus enum
│
└── utils/
    ├── environment.ts                 # Environment variable helpers
    ├── platform.ts                    # OS/CPU/GPU detection
    ├── PerformanceMonitor.ts          # Performance measurement utilities
    ├── pathSandbox.ts                 # Path escaping & sandboxing
    └── fileHelpers.ts                 # File I/O helpers & checksums
```

---

## 3. KernelAPI

The `KernelAPI` is the central control surface exposed to all engines via `IRuntimeContext_v1`:

```typescript
class KernelAPI implements IKernelAPI_v1 {
  readonly version = "1.0.0";
  status: KernelStatus;  // 'INITIALIZING' | 'ACTIVE' | 'SHUTTING_DOWN' | 'SAFE_MODE'

  resolve<T>(serviceName: string): T          // DI container resolution
  publishEvent(envelope: EventEnvelope): void  // EventBus publication
  scheduleTask(task: any): string              // Task scheduling
  shutdown(): Promise<void>                   // Graceful system shutdown
}
```

**KernelStatus Flow:**
```
INITIALIZING → ACTIVE (normal boot)
INITIALIZING → SAFE_MODE (engine load failure)
ACTIVE → SHUTTING_DOWN → SAFE_MODE (shutdown sequence)
```

---

## 4. IEngine Interface (from `@aegis/sdk`)

Every engine must implement:

```typescript
interface IEngine {
  readonly metadata: IEngineMetadata;
  initialize(context: IRuntimeContext_v1): Promise<void>;
  configure(config: Record<string, any>): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  health(): Promise<EngineHealthReport>;
  reload(): Promise<void>;
  shutdown(): Promise<void>;
  dispose(): Promise<void>;
}

interface IEngineMetadata {
  id: string;
  displayName: string;
  version: string;
  kernelApiVersion: string;
  dependencies: string[];        // Engine IDs this engine depends on
  priority: number;              // Lower number = loaded first
  autoStart: boolean;
  singleton: boolean;
  permissions: string[];
}
```

---

## 5. Engine Registry Format (`engine.json`)

Each engine is described by an `engine.json` file in the `engines/` directory:

```json
{
  "id": "aegis-agent",
  "displayName": "AI Agent Engine",
  "version": "1.0.0",
  "kernelApiVersion": "1.0.0",
  "entrypoint": "dist/AgentEngine.js",
  "dependencies": ["aegis-memory"],
  "priority": 10,
  "autoStart": true,
  "singleton": true,
  "permissions": ["fs:read", "fs:write"]
}
```

---

## 6. RuntimeExecutor — ReAct Loop Specification

### 6.1 Configuration (`runtime.json`)

```json
{
  "maxReasoningSteps": 5,
  "maxToolExecutions": 5,
  "streamResponses": true,
  "enableInterruptions": true
}
```

### 6.2 Task Classification

```typescript
function isTaskAssignment(input: string): boolean
```

Task keywords trigger extended planning mode:
`create`, `write`, `modify`, `delete`, `implement`, `build`, `run`, `test`, `execute`,
`file`, `folder`, `directory`, `workspace`, `code`, `script`, `program`, `develop`,
`setup`, `install`, `configure`, `refactor`, `debug`, `fix`, `add tool`, `add skill`,
`add plugin`, `remove tool`, `remove skill`, `remove plugin`, `save to memory`,
`delete session`, `archive session`

OR input length > 120 characters.

### 6.3 GGUF Fast Path

If `providerManager.getActiveProviderName() === 'local/gguf'`:
- Bypasses the ReAct loop entirely
- Routes directly to `GGUFProvider.streamChat()` via Python server
- Appropriate for local small model inference (no tool use)

### 6.4 ReAct Loop

```
Status: IDLE → THINKING → EXECUTING_TOOL → THINKING → ... → IDLE

EventBus emissions per turn:
  execution_started → { input }
  message_received  → { role: 'user', content }
  thinking_started
  response_chunk    → { chunk }  (per token)
  thinking_finished
  tool_started      → { toolName, input }
  tool_finished     → { toolName, output }
  execution_completed
  runtime_error     → { error }  (on failure)
```

---

## 7. Session Lifecycle Specification

### 7.1 Session State Machine

```
                    createNewSession()
                          │
                          ▼
                       CREATING
                          │
                          ▼
                        ACTIVE ◄──── checkoutSession()
                       /      \
          deleteSession()      forwardSession()
                /                    \
            TRASH                  ARCHIVED
               │
          resumeSession()
               │
             ACTIVE
```

### 7.2 Session Files

| File | Format | Description |
|------|--------|-------------|
| `metadata.json` | JSON | Session metadata, timestamps, checksums, quotas, lifecycle state |
| `history.json` | JSON | Message array `[{id, role, content, metadata, createdAt}]` |
| `session-state.json` | JSON | `{currentObjective, activeTasks, stableFacts, preferences}` |
| `session-memory.md` | Markdown | Long-term contextual memory for projection |
| `working-memory.md` | Markdown | Short-term current-turn context |
| `task.md` | Markdown | Active task tracking checklist |

### 7.3 Mount Lease

- Lease duration: **10 minutes** (600,000 ms)
- Lease is renewed on each session checkout
- Expired lease → auto-renewal on next boot
- Prevents zombie mounts from dead processes

### 7.4 Watchdog & Heartbeat

```typescript
heartbeatInterval: NodeJS.Timeout  // Periodic runtime state timestamp update
watchdogInterval: NodeJS.Timeout   // Staleness detection → emit runtime.heartbeat.stale
```

---

## 8. IPC Protocol

The IPC server listens on a named pipe and accepts JSON messages:

```typescript
// IPC message types
type IpcCommand =
  | { type: 'status' }
  | { type: 'engine-info', engineId?: string }
  | { type: 'reload' }
  | { type: 'reload-engine', engineId: string }
  | { type: 'shutdown' }

// IPC response
type IpcResponse = {
  success: boolean;
  data?: any;
  error?: string;
}
```

Usage:
```bash
node ipc-status.mjs         # → { status: 'ACTIVE', engines: [...] }
node ipc-engine-info.mjs    # → { engines: [{id, displayName, status}] }
node ipc-reload.mjs         # → hot-reload all engines
```

---

## 9. Capability Manager Specification

### 9.1 Capability Types

```typescript
enum CapabilityType {
  TOOL    = 'tool',
  PLUGIN  = 'plugin',
  SKILL   = 'skill',
  PROVIDER = 'provider'
}
```

### 9.2 add() Flow

```
CapabilityManager.add(type, path)
  → emit: capability_autoload_started
  → Loader.load(path)        // ToolLoader / SkillLoader / PluginLoader / ProviderLoader
  → Registry.register(item)  // ToolRegistry / SkillRegistry / PluginRegistry / ProviderRegistry
  → ConfigurationManager.updateAutoload(type, 'add', path)  // persist to config
  → emit: capability_added
  → emit: capability_initialized
  → (on failure) emit: capability_failed
```

### 9.3 remove() Flow

```
CapabilityManager.remove(type, path)
  → Registry.find(path)
  → Loader.shutdown(name)    // if applicable (plugin/skill)
  → Registry.unregister(name)
  → ConfigurationManager.updateAutoload(type, 'remove', path)
  → emit: capability_removed
```

---

## 10. Permission System

Engines declare permissions in their `engine.json`. The `SecurityManager` enforces them:

| Permission | Description |
|-----------|-------------|
| `fs:read` | Filesystem read access |
| `fs:write` | Filesystem write access |
| `net:listen` | Bind to network ports |
| `process:spawn` | Spawn child processes |
| `network:tcp` | Open TCP connections |
| `*` | All permissions (use with caution) |

---

## 11. Error Codes

| Code | Description |
|------|-------------|
| `ENGN-4001` | Missing engine dependency |
| `ENGN-4002` | Circular dependency detected |
| `ENGN-4003` | Engine initialization failure |
| `ENGN-4004` | Engine start failure |

---

## 12. Runtime Version

```typescript
export const RUNTIME_VERSION = "1.0.0";
```

---

## 13. Startup Command

```bash
node --import tsx \
     --experimental-specifier-resolution=node \
     --no-warnings \
     packages/aegis-runtime/src/daemon.ts
```

The daemon logs progress through each boot phase and ends with:
```
[Daemon] Aegis Runtime Daemon is fully initialized and active.
[API Server] AEGIS HTTP API is listening on http://127.0.0.1:3005
```
