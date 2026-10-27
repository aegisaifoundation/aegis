# AEGIS EventBus Cross-Engine Architecture & Flowchart

**Document Version:** 1.0.0  
**Target Systems:** `@aegis/runtime`, `@aegis/memory`, `@aegis/agent`, `@aegis/api`, `@aegis/distributed-intelligence`, `@aegis-training-engine`, `@aegis-package-manager`  
**Last Updated:** October 2026  

---

## 1. System Topology Overview

The AEGIS **EventBus** ([`packages/aegis-runtime/src/eventbus/EventBus.ts`](file:///c:/aegis/packages/aegis-runtime/src/eventbus/EventBus.ts)) is a strongly typed, decoupled publish-subscribe messaging nervous system that unifies all 15 platform engines, native C++ runtimes, and external client gateways without introducing tight compile-time coupling.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       GLOBAL EVENT BUS SINGLETON                                       │
│                                           (eventBus / EventEmitter)                                    │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
        ▲                                ▲          │          ▲                          ▲
        │ Emits                          │ Emits    │ Dispatches                          │ Emits &
        │ Events                         │ Events   │ to Handlers                         │ Subscribes
        ▼                                ▼          ▼          ▼                          ▼
┌──────────────────┐             ┌───────────────┐ ┌───────────────┐             ┌──────────────────────┐
│  AI AGENT ENGINE │             │ MEMORY ENGINE │ │ REST API GW   │             │ DISTRIBUTED RUNTIME  │
│  (`aegis-agent`) │             │(`aegis-memory`)│ │ (`aegis-api`) │             │ (DIE / Native C++)   │
├──────────────────┤             ├───────────────┤ ├───────────────┤             ├──────────────────────┤
│ • execution_start│             │ • memory.read │ │ Subscribes to:│             │ • node:discovered    │
│ • thinking_start │             │ • memory.updt │ │ • chunk stream│             │ • node:connected     │
│ • response_chunk │             │ • memory.corpt│ │ • tool events │             │ • peer_heartbeat     │
│ • tool_started   │             │ • session.mnt │ │ • training    │             │ • swarm_consensus    │
│ • tool_finished  │             │ • quarantine  │ │ ──► SSE to UI │             │ ──► IPC / Sockets    │
└──────────────────┘             └───────────────┘ └───────────────┘             └──────────────────────┘
        ▲                                ▲                             ▲                    ▲
        │                                │                             │                    │
┌───────┴──────────┐             ┌───────┴───────────────┐     ┌───────┴───────────┐ ┌──────┴───────────┐
│ TRAINING ENGINES │             │   PACKAGE MANAGER     │     │ CAPABILITIES      │ │ KERNEL CORE      │
│ (FedAvg / Swarm) │             │(`aegis-package-mgr`)  │     │ (Tools/Skills/Plg)│ │ (Bootloader)     │
├──────────────────┤             ├───────────────────────┤     ├───────────────────┤ ├──────────────────┤
│ • train_progress │             │ • package.installing  │     │ • capability_added│ │ • runtime_started│
│ • train_completed│             │ • tx.committed        │     │ • tool_started    │ │ • safe_mode      │
│ • leader_elected │             │ • RegistryUpdated ──► │     │ • skill_executed  │ │ • heartbeat_stale│
└──────────────────┘             └───────────────────────┘     └───────────────────┘ └──────────────────┘
```

---

## 2. Comprehensive Cross-Engine Interaction Flowchart

The following flowchart traces how events trigger actions across each subsystem when a user interacts with the system, executes tools, updates memory, and coordinates training:

```mermaid
flowchart TD
    %% Clients & Gateways
    UI([Desktop UI / Browser Port 5001 / REST Port 3005]) -->|POST /api/chat| APIServer[ApiServer - aegis-api]
    
    %% API Server Setup
    APIServer -->|Subscribe SSE Handlers| Bus1{Global EventBus}
    APIServer -->|Invoke execute| Exec[RuntimeExecutor - aegis-runtime]
    
    %% Agent Execution Loop
    subgraph AgentEngineCycle [AI Agent Execution Cycle]
        Exec -->|emit: execution_started| Bus1
        Exec -->|emit: message_received| Bus1
        Exec -->|emit: thinking_started| Bus1
        
        Exec --> FetchCtx[ProjectionGenerator - aegis-memory]
        FetchCtx --> ModelGen[ProviderManager: Stream LLM]
        
        ModelGen -->|emit: response_chunk| Bus1
        ModelGen --> ParseTool{Contains Tool?}
        
        ParseTool -- Yes --> ToolExec[CapabilityManager: Run Tool]
        ToolExec -->|emit: tool_started| Bus1
        ToolExec --> ToolRun[FileTool / MemoryTool / Shell]
        ToolRun -->|emit: tool_finished| Bus1
        ToolRun --> ModelGen
        
        ParseTool -- No --> TurnDone[Post-Turn Finalization]
    end

    %% Memory Engine Interaction
    subgraph MemoryEngineCycle [Cognitive Memory Engine]
        TurnDone --> FlushMem[MemoryWriteBuffer.flushHistory]
        FlushMem -->|emit: memory.updated| Bus1
        FlushMem --> ChecksumChk{SHA-256 Valid?}
        
        ChecksumChk -- Corruption --> Quarant[SessionRecoveryManager]
        Quarant -->|emit: memory.corrupted| Bus1
        Quarant -->|emit: session.quarantined| Bus1
        Quarant --> RestoreSnap[Restore Snapshot / Safe Session]
        RestoreSnap -->|emit: memory.restored| Bus1
        
        ChecksumChk -- OK --> StateUpdt[SessionStateManager: Extract Facts]
        StateUpdt -->|emit: session.state.persisted| Bus1
    end

    %% Completion & Dispatch
    TurnDone -->|emit: execution_completed| Bus1
    
    %% SSE Event Stream Delivery
    Bus1 -->|Event: response_chunk| SSEResponse[SSE: data: chunk] --> UI
    Bus1 -->|Event: tool_started / tool_finished| SSETool[SSE: data: tool status] --> UI
    Bus1 -->|Event: execution_completed| SSEClose[SSE: stream complete] --> UI
    
    %% Distributed & Learning Engine Interactions
    subgraph DistributedAndTraining [Distributed & Learning Topologies]
        UI -->|POST /api/train| APIServer
        APIServer --> LocalTrainer[LocalTrainer - distributed-learning]
        LocalTrainer -->|emit: training_progress| Bus1
        LocalTrainer -->|emit: training_completed| Bus1
        Bus1 -->|Event: training_progress| SSETrain[SSE: progress update] --> UI
        
        DIE[die-service.exe - C++ Runtime] <-->|IPC / AON Mesh| DIAdapter[DistributedIntelligenceEngine]
        DIAdapter -->|emit: node:discovered| Bus1
        DIAdapter -->|emit: node:connected| Bus1
        DIAdapter -->|emit: swarm.leader.elected| Bus1
    end

    %% Package Manager Engine Interactions
    subgraph PackageManagerCycle [Dynamic Package Hot-Swap]
        PkgCLI[aegis-cli / Admin] -->|Install Package| PM[PackageManager]
        PM -->|emit: package.installing| Bus1
        PM -->|emit: package.transaction.committed| Bus1
        PM -->|emit: RuntimeRegistryUpdated| Bus1
        Bus1 -->|Catch RuntimeRegistryUpdated| EngMgr[EngineManager]
        EngMgr --> ReloadAll[Hot-Reload Engines & Capabilities]
    end
```

---

## 3. Engine-by-Engine Event Matrix

### 3.1 `aegis-agent` & `aegis-runtime` (Reasoning & Orchestration)
The agent driver fires execution lifecycle events that keep the UI responsive and trigger post-processing tasks:

| Event Name | Type | Payload | Handlers / Subscribers |
| :--- | :--- | :--- | :--- |
| `execution_started` | Emission | `{ input: string }` | `ApiServer` (logs & notifies UI) |
| `message_received` | Emission | `{ role: string, content: string }` | `ApiServer`, `MemoryGateway` |
| `thinking_started` | Emission | `{}` | `ApiServer` (shows thinking spinner) |
| `response_chunk` | Emission | `{ chunk: string }` | `ApiServer` (streams tokens via SSE) |
| `tool_started` | Emission | `{ toolName: string, input: any }` | `ApiServer`, telemetry monitors |
| `tool_finished` | Emission | `{ toolName: string, output: string }` | `ApiServer`, telemetry monitors |
| `thinking_finished`| Emission | `{}` | `ApiServer` (clears thinking state) |
| `execution_completed`| Emission | `{ input: string, status: string }` | `ApiServer` (closes SSE stream), `MemoryWriteBuffer` |
| `runtime_error` | Emission | `{ error: string }` | `ApiServer`, error reporter |
| `interrupt` | Emission | `{}` | Active LLM streaming loops (halts execution immediately) |

---

### 3.2 `aegis-memory` (Cognitive Persistence & Integrity)
Maintains session history, working context, and validates file health:

| Event Name | Type | Payload | Handlers / Subscribers |
| :--- | :--- | :--- | :--- |
| `memory.read` | Emission | `{ sessionId, file }` | `MemoryObservability` (reads metrics) |
| `memory.updated` | Emission | `{ sessionId, file, bytes }` | `MemoryObservability`, `MemoryWriteBuffer` |
| `memory.corrupted` | Emission | `{ sessionId, file, expected, actual }` | `SessionRecoveryManager` (triggers quarantine) |
| `session.quarantined` | Emission | `{ sessionId, reason }` | `RuntimeSessionManager`, `ApiServer` alerts |
| `memory.restored` | Emission | `{ sessionId, restoredSnapshot }` | `RuntimeSessionManager` (re-mounts session) |
| `session.mounted` | Emission | `{ sessionId, leaseExpiry }` | `RuntimeExecutor`, `ProjectionGenerator` |
| `session.deleted` | Emission | `{ sessionId }` | Evicts active RAM cache, moves folder to `memory/trash` |

---

### 3.3 `aegis-api` (Client HTTP & Server-Sent Events Gateway)
Acts predominantly as a **consumer and bridge**, forwarding internal events outward to browsers and terminals:

```typescript
// Subscriptions established per HTTP request in packages/aegis-api/src/ApiServer.ts:
eventBus.on('execution_started', onExecutionStarted);
eventBus.on('response_chunk', onResponseChunk);
eventBus.on('tool_started', onToolStarted);
eventBus.on('tool_finished', onToolFinished);
eventBus.on('training_progress', onTrainingProgress);
eventBus.on('execution_completed', onCompleted);
```
* **Connection Lifecycle**: When the client drops the HTTP connection (`req.on('close')`), `ApiServer` invokes `eventBus.off(...)` to prevent memory leaks and zombie listeners.

---

### 3.4 `aegis-training-engine` & `aegis-distributed-learning`
Manages model fine-tuning and federated tensor pooling:

| Event Name | Type | Payload | Handlers / Subscribers |
| :--- | :--- | :--- | :--- |
| `training_progress` | Emission | `{ modelId, epoch, loss, step }` | `ApiServer` (updates UI progress bars) |
| `training_completed` | Emission | `{ modelId, loraId, exportPath }` | `ApiServer`, Model Registry |
| `training_error` | Emission | `{ modelId, error: string }` | `ApiServer`, notification service |
| `consensus.weights.aggregated` | Emission | `{ roundId, numParticipants }` | Swarm Leader coordinator |

---

### 3.5 `distributed-intelligence` (DIE Native C++ Engine)
Bridges low-level network mesh events into the high-level JavaScript runtime:

| Event Name | Type | Payload | Handlers / Subscribers |
| :--- | :--- | :--- | :--- |
| `node:discovered` | Emission | `{ nodeId, ip, port, capabilities }` | `DiscoveryService`, `RoleRegistry` |
| `node:connected` | Emission | `{ nodeId, sessionId }` | Mesh Topology Manager |
| `node:disconnected` | Emission | `{ nodeId, reason }` | Heartbeat watchdog |
| `peer_heartbeat` | Emission | `{ nodeId, latencyMs, load }` | Health monitor, leader election scorer |

---

### 3.6 `aegis-package-manager` (Dynamic Capability Engine)
Coordinates transactional plugin and tool installations:

| Event Name | Type | Payload | Handlers / Subscribers |
| :--- | :--- | :--- | :--- |
| `package.installing` | Emission | `{ packageId, version }` | Admin UI, logging |
| `package.transaction.committed` | Emission | `{ txId, packageId }` | Backup registry |
| `RuntimeRegistryUpdated` | Emission | `{}` | **`EngineManager`** (triggers live reload of system engines without server restart) |

---

## 4. End-to-End Sequence Walkthrough: Chat & Tool Execution

The sequence diagram below shows the exact chronological propagation of events across the EventBus:

```mermaid
sequenceDiagram
    autonumber
    actor User as Desktop UI
    participant API as ApiServer (Port 3005)
    participant Bus as EventBus (Singleton)
    participant Exec as RuntimeExecutor
    participant Model as ProviderManager (LLM)
    participant Tool as FileTool
    participant Mem as MemoryGateway

    User->>API: POST /api/chat { "message": "List folder contents" }
    API->>Bus: on('response_chunk'), on('tool_started'), on('tool_finished'), on('execution_completed')
    API->>Exec: execute("List folder contents")
    
    Exec->>Bus: emit('execution_started', { input })
    Bus-->>API: onExecutionStarted() -> SSE: event: execution_started
    API-->>User: HTTP Event Stream
    
    Exec->>Bus: emit('thinking_started')
    Bus-->>API: onThinkingStarted() -> SSE: event: thinking_started
    API-->>User: Spinner / Thinking indicator
    
    Exec->>Model: streamChat(messages)
    Model-->>Exec: chunk 1
    Exec->>Bus: emit('response_chunk', { chunk: "I will check..." })
    Bus-->>API: onResponseChunk() -> SSE: event: response_chunk
    API-->>User: Token displayed in UI
    
    Model-->>Exec: output: <tool>{"name": "FolderTool", "input": {"action": "list"}}</tool>
    Exec->>Bus: emit('tool_started', { toolName: "FolderTool" })
    Bus-->>API: onToolStarted() -> SSE: event: tool_started
    API-->>User: Tool Execution Badge displayed
    
    Exec->>Tool: execute(input)
    Tool-->>Exec: observation: ["file1.txt", "file2.txt"]
    Exec->>Bus: emit('tool_finished', { output })
    Bus-->>API: onToolFinished() -> SSE: event: tool_finished
    API-->>User: Tool Output Badge displayed
    
    Exec->>Mem: flushHistory(sessionId)
    Mem->>Bus: emit('memory.updated')
    
    Exec->>Bus: emit('execution_completed')
    Bus-->>API: onCompleted() -> SSE: event: execution_completed
    API-->>User: Stream ends
    API->>Bus: off(...) (Unsubscribes all listeners)
```

---

## 5. Architectural Guarantees & Safety Mechanisms

1. **Memory Leak Mitigation**:
   * Event handlers are tracked in a `Set<EventListener>` per event key.
   * Streaming HTTP connections register cleanup hooks on connection drop (`req.on('close')`), invoking `eventBus.off()`.
2. **Synchronous & Asynchronous Fault Isolation**:
   * When listeners execute promises, errors are intercepted with `.catch(...)` preventing unhandled promise rejections from crashing the kernel process.
   * If a synchronous listener throws, the exception is caught in a `try...catch` block so other registered listeners still receive the event.
3. **Structured Event Envelope Standard**:
   * Every event emitted is wrapped in a standard `EventEnvelope<T>` containing:
     * `event`: The canonical event key.
     * `timestamp`: High-resolution timestamp (`Date.now()`).
     * `source`: Originating subsystem ID (e.g., `'agent'`, `'memory'`, `'kernel'`).
     * `payload`: Strongly typed data payload.
4. **Hot-Reload Trigger Loop**:
   * The package manager emits `RuntimeRegistryUpdated` upon committing an engine package, allowing `EngineManager` to dynamically reload manifests without taking down the daemon.
