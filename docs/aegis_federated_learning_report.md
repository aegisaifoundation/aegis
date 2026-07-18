# AEGIS — Distributed Intelligence Engine (DIE) Report
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

> **Previously:** `aegis_federated_learning_report.md`
> **Updated to reflect:** Current implementation — C++20 Distributed Intelligence Engine

---

## 1. Overview

The **Distributed Intelligence Engine (DIE)** is AEGIS's native C++20 runtime that provides the distributed computing foundation. It runs as a **standalone binary** (`die-service.exe` / `die-service`) managed by the TypeScript adapter layer.

The DIE is **not** merely a federated learning library. It is a complete distributed node operating layer providing:
- Node identity, lifecycle, and state management
- Peer discovery and cluster membership
- Heartbeat liveness monitoring
- TCP message transport
- Cross-node message bus
- System resource monitoring
- AI Runtime (AIR) — agent scheduling across nodes
- Distributed Inference Service (DIS) — inference workload distribution

---

## 2. Repository Location

```
packages/aegis-distributed-intelligence/
├── CMakeLists.txt        # Full C++20 build system (29 modular targets)
├── build.ps1             # Windows CMake build helper
├── manifest.json         # Engine manifest
├── package.json          # npm package (@aegis/distributed-intelligence)
├── tsconfig.json
│
├── cpp/
│   ├── include/aegis/    # All C++ headers
│   ├── src/              # C++ implementations
│   │   ├── lifecycle/    # StateTransition.cpp, LifecycleManager.cpp
│   │   ├── discovery/    # DiscoveryManagerImpl.cpp
│   │   ├── heartbeat/    # HeartbeatManagerImpl.cpp
│   │   ├── membership/   # MembershipManagerImpl.cpp
│   │   ├── transport/    # TcpTransport.cpp
│   │   ├── events/       # EventDispatcher.cpp
│   │   ├── messaging/    # MessageBus.cpp
│   │   ├── registry/     # RegistryImpls.cpp
│   │   ├── node/         # Node.cpp
│   │   ├── runtime/      # DistributedRuntime.cpp, NodeRuntime.cpp
│   │   ├── resource-manager/  # ResourceManager.cpp + 7 sub-modules
│   │   ├── ai-runtime/   # AIRuntime.cpp + components
│   │   ├── distributed-inference/ # InferenceSession, SessionPool, etc.
│   │   └── service/      # DieService.cpp (main entry point)
│   └── tests/            # Unit and integration test suites
│
├── src/                  # TypeScript adapter (TS ↔ C++ bridge)
│   ├── adapter/          # DistributedIntelligenceEngine.ts
│   ├── capabilities/
│   ├── configuration/
│   ├── diagnostics/
│   ├── events/
│   ├── ipc/
│   ├── lifecycle/        # EngineLifecycle.ts
│   ├── logging/
│   ├── models/
│   ├── monitoring/
│   ├── protocol/
│   └── state/            # EngineState.ts
│
└── dist/                 # Compiled TypeScript + binary outputs
    └── die-service.exe   # Compiled C++ binary (Windows)
```

---

## 3. C++ Module Architecture

### 3.1 Module Dependency Graph

```
die-common (INTERFACE headers only)
    │
    ├─ die-kernel          (INTERFACE)
    ├─ die-identity        (INTERFACE)
    ├─ die-capabilities    (INTERFACE)
    ├─ die-resources       (INTERFACE)
    ├─ die-roles           (INTERFACE)
    ├─ die-state           (INTERFACE)
    ├─ die-consensus       (INTERFACE)
    ├─ die-topology        (INTERFACE)
    ├─ die-policy          (INTERFACE)
    ├─ die-health          (INTERFACE)
    ├─ die-tasks           (INTERFACE)
    ├─ die-cluster         (INTERFACE)
    ├─ die-serialization   (INTERFACE)
    ├─ die-metadata        (INTERFACE)
    ├─ die-configuration   (INTERFACE)
    ├─ die-statistics      (INTERFACE)
    └─ die-scheduler       (INTERFACE)

die-lifecycle  (STATIC: StateTransition.cpp, LifecycleManager.cpp)
    ← depends: die-state, die-common

die-node       (STATIC: Node.cpp)
    ← depends: die-identity, die-capabilities, die-resources, die-roles,
               die-state, die-lifecycle, die-metadata, die-configuration,
               die-statistics, die-health, die-membership, die-policy

die-discovery  (STATIC: DiscoveryManagerImpl.cpp)
die-heartbeat  (STATIC: HeartbeatManagerImpl.cpp)
die-membership (STATIC: MembershipManagerImpl.cpp)
die-transport  (STATIC: TcpTransport.cpp) → ws2_32 on Windows
die-events     (STATIC: EventDispatcher.cpp)
die-messaging  (STATIC: MessageBus.cpp)
die-registry   (STATIC: RegistryImpls.cpp)
    ← depends: die-common, die-capabilities, die-resources, die-roles

die-runtime    (STATIC: DistributedRuntime.cpp + NodeRuntime.cpp)
    ← depends: die-node, die-kernel, die-registry, die-messaging,
               die-transport, die-events

die-resource-manager (STATIC: 8 source files)
    ← depends: die-common, die-capabilities, die-resources, die-health,
               die-statistics, die-events, die-transport
```

### 3.2 Executables

| Binary | Links | Purpose |
|--------|-------|---------|
| `die-service` | die-runtime + die-resource-manager | Production runtime (spawned by TS adapter) |
| `die-tests` | All modules + test suites | Testing executable |

---

## 4. C++ Subsystem Reference

### 4.1 DistributedRuntime

`cpp/src/runtime/DistributedRuntime.cpp`

The root C++ runtime object. Owns and coordinates:
- NodeRuntime instance
- Registry instances
- Message bus
- Transport layer
- Event dispatcher

### 4.2 NodeRuntime

`cpp/src/runtime/NodeRuntime.cpp`

Per-node execution context. Manages:
- Node identity & state
- Local lifecycle
- Service host

### 4.3 Node

`cpp/src/node/Node.cpp`

Full node descriptor and state container. Fields:
- Identity (nodeId, name, region, zone)
- Capabilities (compute, memory, storage)
- Resources (CPU, RAM, GPU)
- Roles (coordinator, worker, inference node)
- State (JOINING, ACTIVE, LEAVING, DEAD)
- Lifecycle hooks
- Health status
- Membership state
- Policy bindings

### 4.4 Discovery Manager

`cpp/src/discovery/DiscoveryManagerImpl.cpp`

Handles peer node discovery via UDP broadcast or configured seed nodes. Announces local node presence and learns about remote nodes.

### 4.5 Heartbeat Manager

`cpp/src/heartbeat/HeartbeatManagerImpl.cpp`

Sends periodic liveness signals between nodes. Detects node failures when heartbeats stop arriving within timeout window.

### 4.6 Membership Manager

`cpp/src/membership/MembershipManagerImpl.cpp`

Maintains the cluster membership table. Tracks which nodes are active, joining, or departed. Coordinates with Discovery and Heartbeat managers.

### 4.7 TCP Transport

`cpp/src/transport/TcpTransport.cpp`

Raw TCP socket transport layer for node-to-node communication. On Windows links against `ws2_32`.

### 4.8 Message Bus

`cpp/src/messaging/MessageBus.cpp`

Internal publish-subscribe bus for routing messages between C++ subsystems.

### 4.9 Event Dispatcher

`cpp/src/events/EventDispatcher.cpp`

Dispatches lifecycle and state events within the C++ runtime.

### 4.10 Registry Implementations

`cpp/src/registry/RegistryImpls.cpp`

Four registries:
- **NodeRegistry**: Known cluster nodes
- **ServiceRegistry**: Available services across cluster
- **PluginRegistry**: Loaded C++ plugins
- **TopicRegistry**: Message topic subscriptions

### 4.11 Resource Manager

`cpp/src/resource-manager/` (8 source files)

Full hardware telemetry and resource publication system:

| Module | Responsibility |
|--------|---------------|
| `ResourceManager.cpp` | Root orchestrator |
| `ResourceCollector.cpp` | Gather CPU/RAM/GPU metrics from OS |
| `ResourcePublisher.cpp` | Broadcast metrics to cluster peers |
| `ResourceCache.cpp` | In-memory snapshot of latest metrics |
| `ResourceMonitor.cpp` | Threshold alerts (CPU > 90%, etc.) |
| `ResourceSnapshot.cpp` | Point-in-time resource state |
| `ResourceHistory.cpp` | Rolling history of resource samples |
| `ResourceStatistics.cpp` | Statistical analysis (avg, peak, p95) |

---

## 5. AI Runtime (AIR) — `aegis::air` Namespace

`cpp/src/ai-runtime/`

The AIR is the C++ counterpart to the TypeScript AgentEngine. It manages AI components that can span multiple cluster nodes.

### 5.1 AIRuntime Components

```cpp
class AIRuntime : public IService {
  AgentRegistry       m_agentRegistry;       // Known agents
  AgentLifecycleManager m_lifecycleManager;  // Agent lifecycle (start/stop/pause)
  TaskSchedulerAdapter  m_schedulerAdapter;  // Bridge to DIR Scheduler
  AgentOrchestrator     m_orchestrator;      // Multi-agent coordination
  WorkflowEngine        m_workflowEngine;    // Multi-step workflows

  MemoryManager         m_memoryManager;     // C++ memory context
  KnowledgeManager      m_knowledgeManager;  // Knowledge base access
  PromptManager         m_promptManager;     // Prompt assembly
  ContextManager        m_contextManager;    // Context building
  ToolRuntime           m_toolRuntime;       // Tool execution runtime

  AIServiceManager      m_serviceManager;    // Service registry for AI
  AIRuntimeMetrics      m_metrics;           // Performance metrics
  PolicyManager         m_policyManager;     // Execution policies
  TrustManager          m_trustManager;      // Agent trust scoring
  ModelManager          m_modelManager;      // Model loading/switching
};
```

### 5.2 TaskSchedulerAdapter

`cpp/src/ai-runtime/tasks/TaskSchedulerAdapter.cpp`

Bridges AIR task scheduling to the DIR (Distributed Intelligence Runtime) node scheduler:

```cpp
std::string TaskSchedulerAdapter::getExecutionLocation(const AITask& task) {
  // Query NodeRegistry for available cluster nodes
  // Feed nodes to DIR Scheduler
  // Return best node name for task execution
}
```

Logic:
1. Query `NodeRegistry` for cluster nodes
2. If no registry or no nodes → return local node name
3. Convert nodes to `NodeDescriptor` for DIR Scheduler
4. Call `Scheduler.scheduleTask(task.goal, flatNodes)` → returns best node

### 5.3 Agent Components

```
cpp/src/ai-runtime/agents/
├── IAgent.hpp                # Agent interface
├── AgentBase.hpp             # Base agent implementation
├── AgentFactory.cpp          # Agent construction factory
├── AgentLifecycleManager.cpp # Start/stop/pause agent processes
└── AgentRegistry.cpp         # Register/lookup agents
```

---

## 6. Distributed Inference Service (DIS) — `aegis::dis` Namespace

`cpp/src/distributed-inference/`

### 6.1 DIS Components

```
distributed-inference/
├── api/               # InferenceRequest.hpp, InferenceResponse.hpp
├── backend/           # IInferenceBackend.hpp (abstract interface)
├── cache/             # Inference result caching
├── execution/         # Execution pipeline
├── inference/         # Core inference components
│   ├── InferenceSession.cpp   # Single inference session
│   ├── SessionPool.cpp         # Session pool management
│   ├── PromptBuilder.cpp       # Prompt assembly
│   ├── ContextBuilder.cpp      # Context assembly
│   ├── TokenStreamer.cpp        # Token-by-token streaming
│   └── ResponseAssembler.cpp   # Response construction
├── metrics/           # Inference performance metrics
├── models/            # Model metadata
├── protocol/          # Wire protocol definitions
└── runtime/           # Inference runtime orchestration
```

### 6.2 Inference Pipeline

```
InferenceRequest { model, prompt, systemPrompt, context, maxTokens, temperature }
         │
         ▼
ContextBuilder.assembleContext(memoryHistory, knowledgeFacts)
         │
         ▼
PromptBuilder.buildPrompt(systemPrompt, userPrompt, contextText)
  → "<|system|>\n{system}\n<|context|>\n{context}\n<|user|>\n{user}\n<|assistant|>\n"
         │
         ▼
SessionPool.acquireSession(sessionId, backend)
         │
         ▼
InferenceSession.run(request) → IInferenceBackend.generate(request)
         │
         ▼
TokenStreamer.streamTokens(text, callback) → token-by-token delivery
         │
         ▼
ResponseAssembler.assemble(result, latencyMs)
  → InferenceResponse { success, text, error, latencyMs, tokensPerSec }
```

---

## 7. TypeScript Adapter Layer

### 7.1 DistributedIntelligenceEngine.ts

The TypeScript `IEngine` implementation that manages the C++ process:

```typescript
class DistributedIntelligenceEngine implements IEngine {
  metadata = {
    id: 'distributed-intelligence',
    displayName: 'Distributed Intelligence Engine',
    version: '1.0.0',
    priority: 5,
    autoStart: true,
    singleton: true,
    permissions: ['process:spawn', 'network:tcp', 'fs:read']
  };

  initialize(ctx) → resolveExecutable() + lifecycle.initialize()
  start()        → lifecycle.start()
  health()       → lifecycle.getHealthMonitor().getHealthReport()
  shutdown()     → lifecycle.shutdown()

  // Introspection
  getState()       → lifecycle.getStateMachine().getState()
  getPid()         → lifecycle.getSupervisor().getChildProcess().pid
  getStartedAt()   → Date | null
  getUptimeMs()    → number (ms since start)
  getRestartCount() → number
}
```

### 7.2 Executable Resolution

```typescript
private resolveExecutable(): string {
  // Walk up the directory tree to find package.json
  // with name === '@aegis/distributed-intelligence'
  // Return: <packageRoot>/dist/die-service.exe (Windows)
  //         <packageRoot>/dist/die-service      (Linux/macOS)
}
```

### 7.3 Engine State Machine

```
INITIALIZING → ONLINE → PAUSED → ONLINE (resume)
ONLINE       → OFFLINE (shutdown)
INITIALIZING → OFFLINE (init failure)
```

### 7.4 Event Forwarding

```typescript
this.lifecycle.on('runtimeEvent', (eventName, payload) => {
  this.context.getEventBus()?.emit(eventName, payload, 'distributed-intelligence');
});

this.lifecycle.on('state', (state) => {
  if (state === EngineState.ONLINE) {
    this.context.getEventBus()?.emit('engine:ready', { engineId: this.metadata.id });
  }
});
```

---

## 8. Build System

### 8.1 CMake Build (Windows)

```powershell
cd packages/aegis-distributed-intelligence
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
# Output: build/Release/die-service.exe
```

Or use the helper script:
```powershell
.\build.ps1
```

### 8.2 Required Dependencies

| Dependency | Purpose |
|-----------|---------|
| CMake 3.15+ | Build system |
| C++20 compiler (MSVC 2022 / GCC 11+) | Compilation |
| ws2_32 (Windows SDK) | Winsock TCP/UDP |

---

## 9. Engine Manifest

```json
{
  "id": "distributed-intelligence",
  "name": "Distributed Intelligence Engine",
  "version": "1.0.0",
  "type": "Engine",
  "entrypoint": "dist/index.js",
  "kernelApiVersion": "1.0.0",
  "sdkVersion": "1.0.0",
  "permissions": ["process:spawn", "network:tcp", "fs:read"],
  "dependencies": {},
  "supportedPlatforms": ["win32", "linux", "darwin"],
  "description": "AEGIS Distributed Intelligence Kernel — C++20 native engine providing distributed node discovery, heartbeat, membership management, messaging, and resource monitoring."
}
```

---

## 10. Test Suite

C++ tests compiled into `die-tests` executable:

```
cpp/tests/
├── TestRunner.cpp
├── common/TypesTest.cpp
├── kernel/KernelTest.cpp
├── node/NodeTest.cpp
├── state/StateTest.cpp
├── lifecycle/LifecycleTest.cpp
├── membership/MembershipTest.cpp
├── policy/PolicyTest.cpp
├── serialization/SerializationTest.cpp
├── runtime/RuntimeTest.cpp
├── messaging/MessagingTest.cpp
├── transport/TransportTest.cpp
├── demo/LocalNetworkDemo.cpp
├── resource-manager/ResourceManagerTest.cpp
└── resource-manager/ResourceSyncDemo.cpp
```

---

## 11. Current Status & Roadmap

| Component | Status |
|-----------|--------|
| TypeScript adapter | ✅ Complete |
| C++ core (runtime, node, transport, messaging) | ✅ Complete |
| C++ resource manager | ✅ Complete |
| C++ discovery, heartbeat, membership | ✅ Complete |
| C++ AI Runtime (AIR) structure | 🔶 Structure ready, impl stubs |
| C++ DIS (inference) structure | 🔶 Structure ready, needs backend drivers |
| Binary compilation on target machine | 🔶 Pending |
| Multi-node cluster testing | 🔶 Pending binary compilation |
