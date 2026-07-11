# AEGIS Core Runtime Specification v1.0
## The Engineering Constitution of the AEGIS Platform Kernel

---

## 1. Purpose and Scope of the Kernel

The **AEGIS Core Runtime (Kernel)** is the fundamental, immutable execution engine of the AEGIS Decentralized Federated Medical AI Platform. It operates as a hardware-independent, AI-agnostic microkernel designed to provide core system facilities, namespace sandboxing, dependency injection, and asynchronous inter-module message routing.

The scope of the kernel is strictly limited to infrastructure virtualization. It abstracts the underlying host operating system (Windows, Linux, macOS) and hardware (x86, ARM, NVIDIA Jetson) into a standardized, execution-safe environment. All clinical domain logic, model loading, vector database RAG operations, and API interfaces reside strictly in the user-space as pluggable engines.

---

## 2. Responsibilities That Belong Inside the Kernel

The kernel owns and maintains exclusive control over the following systems:
*   **Microkernel Bootloader & Lifecycle Controller:** Orchestrates the deterministic, 5-phase execution flow of the system.
*   **Dependency Injection & Registry Container:** Manages the registration and resolution of core infrastructure services and pluggable engine instances.
*   **Sandboxed Workspace & Path Resolver:** Virtualizes the filesystem, preventing directory traversal attacks.
*   **Multi-Domain Event Bus Router:** Dispatches synchronous and asynchronous events across decoupled boundaries.
*   **Security & Permissions Manager:** Enforces Least Privilege execution and validates capabilities.
*   **State Recovery & Checkpoint Manager:** Guarantees atomic session writes and rollback protections against crash events.
*   **Structured Logging & Performance Diagnostics:** Generates machine-readable telemetry outputs.

---

## 3. Responsibilities That Must Never Exist Inside the Kernel

The following domains are explicitly excluded from the kernel:
*   **Agent Logic:** Planning loops, ReAct executors, and LLM reasoning steps.
*   **RAG & Retrieval Logic:** Chunks, embeddings, vector database similarity calculations, and search indices.
*   **Model Loading & Inference:** GGUF runtimes, Ollama connections, and tensor operations.
*   **Federated Learning:** Averaging gradients, model versioning, and client upload caching.
*   **Domain & Business Rules:** Medical formats, HL7 FHIR structures, and clinical data parsers.

---

## 4. Public Kernel API Contracts

All pluggable engines, plugins, and tools interact with the kernel exclusively through the stable, versioned Kernel API contracts. No module is permitted to import implementation classes directly.

### 4.1. Core Kernel API Interface
```typescript
/**
 * @version 1.0.0
 * Stable Public Interface for the AEGIS Platform Kernel.
 */
export interface IKernelAPI_v1 {
  readonly version: string;
  readonly status: KernelStatus;
  
  /**
   * Resolves a registered infrastructure service from the DI Container.
   */
  resolve<T>(serviceName: string): T;
  
  /**
   * Publishes an event envelope to the global EventBus router.
   */
  publishEvent(envelope: EventEnvelope): void;
  
  /**
   * Regulates task scheduler execution queues.
   */
  scheduleTask(task: ScheduledTask): string;
  
  /**
   * Initiates a graceful shutdown of the kernel and all loaded engines.
   */
  shutdown(): Promise<void>;
}

export type KernelStatus = 'INITIALIZING' | 'ACTIVE' | 'DEGRADED' | 'SHUTTING_DOWN' | 'SAFE_MODE';
```

---

## 5. Runtime SDK Contracts

The Runtime SDK (`@aegis/sdk`) is the official development platform. Engines, plugins, and tools depend exclusively on the SDK during compilation.

### 5.1. SDK Exports and Boundaries
The SDK exports:
1.  **Stable Interfaces:** `IKernelAPI_v1`, `IRuntimeContext_v1`, `IEngine`, `IEventBus`.
2.  **Telemetry Standards:** `ILogger`, `PerformanceMonitor`.
3.  **Security Interfaces:** `IPermissionVerifier`.
4.  **Data Primitives:** `EventEnvelope`, `SessionCheckpoint`, `RuntimeConfig`.

---

## 6. RuntimeContext Specification

The `RuntimeContext` is the single payload injected into engines during initialization. It encapsulates the host platform metadata and provides access to authorized kernel services.

```typescript
export interface IRuntimeContext_v1 {
  readonly runtimeId: string;
  readonly kernelVersion: string;
  readonly bootId: string;
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly bootMode: 'NORMAL' | 'SAFE_MODE' | 'RECOVERY_MODE';
  
  getWorkspacePath(): string;
  getLogger(): ILogger;
  getConfig(): Record<string, any>;
  getSecrets(): Record<string, string>;
  getService<T>(tokenName: string): T;
  getEventBus(): IEventBus;
}
```

---

## 7. Engine Interface Specification

 Pluggable engines must implement the standard lifecycle interface:

```typescript
export interface IEngine {
  readonly metadata: IEngineMetadata;
  
  /**
   * Triggered in Phase 5 of bootloader. Performs DI resolutions and basic setup.
   */
  initialize(context: IRuntimeContext_v1): Promise<void>;
  
  /**
   * Applies schema-validated configurations to the engine.
   */
  configure(config: Record<string, any>): Promise<void>;
  
  /**
   * Mounts event listeners and boots background threads/servers.
   */
  start(): Promise<void>;
  
  pause(): Promise<void>;
  
  resume(): Promise<void>;
  
  /**
   * Performs self-diagnostic metrics checks.
   */
  health(): Promise<EngineHealthReport>;
  
  /**
   * Dynamically applies new runtime.json variables without shutdown.
   */
  reload(): Promise<void>;
  
  shutdown(): Promise<void>;
  
  dispose(): Promise<void>;
}

export interface EngineHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  latencyMs: number;
  message?: string;
  details?: Record<string, any>;
}
```

---

## 8. Engine Manifest Schema

Every pluggable engine must bundle an `engine.json` manifest at its root. This manifest defines its loading priority, required permissions, and boot dependencies.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EngineManifest",
  "type": "OBJECT",
  "properties": {
    "id": { "type": "STRING" },
    "displayName": { "type": "STRING" },
    "version": { "type": "STRING" },
    "kernelApiVersion": { "type": "STRING" },
    "dependencies": {
      "type": "ARRAY",
      "items": { "type": "STRING" }
    },
    "priority": { "type": "INTEGER", "minimum": 0 },
    "autoStart": { "type": "BOOLEAN" },
    "singleton": { "type": "BOOLEAN" },
    "permissions": {
      "type": "ARRAY",
      "items": { "type": "STRING" }
    },
    "configSchema": { "type": "OBJECT" }
  },
  "required": ["id", "displayName", "version", "kernelApiVersion", "dependencies", "permissions"]
}
```

---

## 9. Boot Sequence Guarantees

The microkernel boot sequence is single-threaded, synchronous, and deterministic. It guarantees that no step begins until all prerequisites of the previous phase are resolved.

### 9.1. Boot Sequence Phase Mappings
```
Phase 1: Detect Platform ➔ Phase 2: Configuration ➔ Phase 3: DI & Services ➔ Phase 4: Recovery ➔ Phase 5: Engine Loading
```
1.  **Phase 1 (OS & Env Validation):** Confirms paths exist and determines platform configurations.
2.  **Phase 2 (Config Setup):** Resolves encryption keys, loads secrets, and mounts standard EventBus instances.
3.  **Phase 3 (Services Binding):** Binds core kernel modules to the DI Container.
4.  **Phase 4 (Session State Restoration):** Evaluates write journals and repairs states.
5.  **Phase 5 (Engine Mounting):** Resolves dependency sorting (DAG) and runs `initialize()` and `start()` on engines sequentially.

---

## 10. Lifecycle Definitions for Runtime and Engines

### 10.1. Kernel Lifecycle State Transitions
```
[UNINITIALIZED] ➔ [INITIALIZING] ➔ [ACTIVE] ➔ [SHUTTING_DOWN] ➔ [OFF]
                                   │ (Unclean shutdown)
                                   ▼
                             [RECOVERING] ➔ [SAFE_MODE] (On consecutive failures)
```

### 10.2. Engine Lifecycle State Transitions
```
[REGISTERED] ➔ [INITIALIZED] ➔ [STARTING] ➔ [RUNNING] ➔ [STOPPING] ➔ [DISPOSED]
                                             ▲   │
                                       Resume│   │Pause
                                             │   ▼
                                           [PAUSED]
```

---

## 11. Event Namespace Conventions

To guarantee performance and security, events are isolated into namespace channels. Subscribers must specify the complete namespace topic pattern to receive events.

| Namespace | Emitting Subsytem | Sample Topics | Subscription Policy |
| :--- | :--- | :--- | :--- |
| `system.*` | Core Kernel | `system.started`, `system.shutdown` | Public (All engines) |
| `store.*` | Workspace Manager | `store.write`, `store.checksum_fail` | Protected (Storage modules) |
| `engine.*` | Engine Manager | `engine.loaded`, `engine.failed` | Public |
| `security.*` | Security Manager | `security.violation`, `security.key_update` | Restricted (Security Module Only) |
| `metric.*` | Performance Monitor | `metric.cpu_alert`, `metric.latency_dump` | Public |

---

## 12. Logging Schema and Structured Log Format

The kernel enforces structured JSON output logging to `stdout` and `runtime.log` to support external indexing (e.g. ELK, Loki, Splunk).

### 12.1. Standard Log Entry Interface
```typescript
export interface LogEntry {
  timestamp: string;      // ISO-8601 UTC timestamp
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  bootId: string;         // Unique UUID generated per boot
  runtimeId: string;      // Unique UUID identifying this kernel node
  actor: string;          // Authorizing agent ('user', 'system', engine name)
  message: string;        // Human-readable message
  code: string;           // Standardized Error Code
  context?: Record<string, any>; // Arbitrary diagnostic variables
}
```

---

## 13. Error Code Conventions and Categorization

Errors are categorized by standard alphanumeric prefixes matching their subsystem origin:

```
[PREFIX] - [4-DIGIT CODE]
Example: KERN-1002 (System config read error)
```

*   `KERN-XXXX` - Core Kernel/Loader Errors (e.g. `KERN-1001` DI Resolution Failure).
*   `SECR-XXXX` - Security and Sandboxing Violations (e.g. `SECR-2003` Workspace Boundary Escaped).
*   `STOR-XXXX` - Storage and Checkpoint Corruptions (e.g. `STOR-3011` Rollback Log Corruption).
*   `ENGN-XXXX` - Engine Lifecycle and Dependency Failures (e.g. `ENGN-4002` Circular Dependency Block).

---

## 14. Configuration File Schemas and Validation Rules

System configurations reside in `runtime.json`. Changes to this file are monitored, but values are only applied after passing validation rules:

```json
{
  "version": "1.0.0",
  "installMode": "Standard",
  "hardware": {
    "cpu": "Intel Core",
    "ram": 16,
    "cudaEnabled": true
  },
  "workspace": "C:\\aegis\\workspace",
  "autoloadEngines": [
    "aegis-agent",
    "aegis-memory",
    "aegis-api"
  ]
}
```

### Configuration Validation Rules
- **Schema Validation:** On reload, `runtime.json` is parsed against a strict JSON-schema. If parsing fails, changes are ignored.
- **Portability Guard:** The `workspace` path must resolve to a valid local absolute path; relative path components (`..`, `./`) are prohibited.

---

## 15. Security Model and Permission System

The kernel enforces strict **Filesystem Sandboxing** and **Capabilities Isolation**:
1.  **FS isolation:** Every read/write operation is checked by the `WorkspaceManager`. Paths containing traversal sequences (`..`) or resolving outside the workspace directory are rejected with a `SECR-2003` error.
2.  **Least Privilege Execution:** Modules request permissions in their manifests. The kernel's `SecurityManager` intercepts actions (like calling terminal commands or external network endpoints) and validates that the calling capability is authorized.

---

## 16. Plugin, Tool, and Engine Loading Contracts

1.  **Engines Loading:** Resolved via topological dependency sorting on start. If an engine's dependencies are missing or fail to load, the engine is marked `FAILED` and isolated.
2.  **Plugins (Hot-Reloadable):** Plugins reside under `plugins/shared/`. They must contain `permissions.json` and signed certificates. The `PluginManager` loads plugins in separate modules.
3.  **Tools (Action Executors):** Tools contain schemas and manifests defining their inputs. On invocation, the kernel verifies the input variables against the tool's schema before routing.

---

## 17. Versioning Policy

AEGIS Core uses **Semantic Versioning 2.0.0 (SemVer)**:
- **Major Version:** Incrementing indicates breaking changes to the Kernel SDK API contracts.
- **Minor Version:** Incrementing indicates the addition of new infrastructure APIs or features in a backward-compatible manner.
- **Patch Version:** Incrementing indicates backward-compatible bug fixes or security hotfixes.

---

## 18. Compatibility Policy

*   **Manifest Compatibility:** Engine manifests (`engine.json`) must explicitly declare target `kernelApiVersion` parameters.
*   **Backward Compatibility Guarantee:** A minor version update of the kernel will not break existing major engines. Engines compiled against `v1.0` of the SDK are guaranteed to run on any kernel version `v1.x`.

---

## 19. Observability and Diagnostics Standards

The kernel exposes real-time diagnostics:
- **Health check endpoint:** Pluggable engines must export a `.health()` check return values to the `EngineManager` every 10 seconds.
- **Memory Checkpointing:** If a thread crash or timeout occurs, the kernel dumps active registries, pending tasks, and recent event buses logs to `/workspace/logs/crash-dumps/`.

---

## 20. Performance and Reliability Guarantees

*   **Non-Blocking Reasoning Thread:** Direct disk writes must not run on the main agent loop.
*   **Startup Bound:** The kernel must complete Phase 1 through 4 of bootloader under 250 milliseconds.
*   **Crash Recovery Time:** Standard session state restoration from backups must execute under 500 milliseconds.

---

## 21. Cross-Platform Support Requirements

No hardware or OS-specific imports are permitted in `@aegis/runtime`.
- Path separators are resolved using standard platform separators (`path.sep`).
- System telemetry uses Node.js `os` abstractions.
- All hardware-specific performance adjustments (such as mapping CPU NEON architectures or CUDA GPU threads) are resolved by installer configurations and passed to engines as configurations, keeping the kernel codebase immutable.

---

## 22. Installer Requirements and Deployment Guarantees

The installer (`install.ps1`) must validate system prerequisites:
1.  **Verify Host Node version (v18+).**
2.  **Profile CPU architecture (ARM vs x86) and GPU presence.**
3.  **Generate local workspace structures and configuration parameters.**
4.  **Issue local RSA certificates for secure node validations.**
5.  **Compile TypeScript modules.**
6.  **Run diagnostic tests before starting the active runtime.**

---

## 23. Coding Standards That Apply Specifically to the Kernel

*   **No Global Singletons:** All core infrastructure services must be instantiated and bound to the DI container. Global state objects are strictly prohibited.
*   **Strict Error Boundaries:** Every filesystem call must be wrapped in `try/catch` handlers with standard error logs generated.
*   **Type Safety:** No `any` type usage is permitted inside `@aegis/sdk` or `@aegis/runtime`.

---

## 24. Directory Structure and Package Ownership

*   `packages/aegis-sdk/` - Owned by Kernel SDK. Cannot import from other modules.
*   `packages/aegis-runtime/` - Owned by Kernel Core. Can only import from `aegis-sdk`.
*   `packages/aegis-agent/` - Owned by Agent Engine. Can import from `aegis-sdk`.
*   `packages/aegis-memory/` - Owned by Memory Engine. Can import from `aegis-sdk`.
*   `packages/aegis-api/` - Owned by REST Server Engine. Can import from `aegis-sdk`.

---

## 25. Rules for Future Contributors

New features must be implemented without editing the kernel core:
1.  **Add a new capability?** Implement it as a pluggable Tool or Skill, registering its schema and permissions manifest.
2.  **Add a new interface (e.g., Electron GUI, Mobile REST connector)?** Add it as a pluggable API Engine that resolves the `IKernelAPI` interface.
3.  **Add a new LLM / Vector database?** Add it as a pluggable Provider or Memory Engine, subscribing to EventBus notifications to update indexes.
4.  **No modification to `packages/aegis-runtime/` is allowed without a SemVer major/minor version change proposal.**
