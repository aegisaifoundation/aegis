# AEGIS Master Developer Handbook — Platform Engineering Specification

> **Document Version:** 2.0.0  
> **Platform Version:** 1.0.0  
> **Document Status:** Authoritative Technical Standard  
> **Target Audience:** Systems Architects, Principal Infrastructure Engineers, Compiler Engineers, Distributed Systems Engineers, Security Auditors, SDK Developers  

---

## Executive Summary & System Overview

**AEGIS** (Advanced Enterprise General Intelligence System) is a high-assurance, privacy-preserving, enterprise-grade distributed AI operating system. Designed around a contract-driven **TypeScript Microkernel** and a high-performance **Native C++20 Distributed Intelligence Runtime (DIE)**, AEGIS provides an isolated, deterministic, and fault-tolerant environment for orchestrating AI models, intelligent agents, cognitive memory stores, and distributed computing tasks across heterogeneous local and networked nodes.

This handbook serves as the definitive engineering specification for the AEGIS platform architecture, runtime engine contracts, memory transaction engine, distributed consensus protocols, security models, SDK APIs, and extension interfaces.

---

## Master Table of Contents

- [Part I — Platform Vision](#part-i--platform-vision)
- [Part II — Architecture](#part-ii--architecture)
- [Part III — Architecture Decision Records (ADR)](#part-iii--architecture-decision-records-adr)
- [Part IV — Runtime Lifecycle](#part-iv--runtime-lifecycle)
- [Part V — Runtime State Machines](#part-v--runtime-state-machines)
- [Part VI — Public API Specification](#part-vi--public-api-specification)
- [Part VII — SDK Reference (`@aegis/sdk`)](#part-vii--sdk-reference-aegissdk)
- [Part VIII — Protocol Specifications](#part-viii--protocol-specifications)
- [Part IX — Distributed Runtime](#part-ix--distributed-runtime)
- [Part X — Security Architecture](#part-x--security-architecture)
- [Part XI — Performance Engineering](#part-xi--performance-engineering)
- [Part XII — Reliability Engineering](#part-xii--reliability-engineering)
- [Part XIII — Observability](#part-xiii--observability)
- [Part XIV — Developer Guide](#part-xiv--developer-guide)
- [Part XV — Compatibility Policy](#part-xv--compatibility-policy)
- [Part XVI — Governance](#part-xvi--governance)
- [Part XVII — Engineering Standards](#part-xvii--engineering-standards)
- [Part XVIII — Appendices](#part-xviii--appendices)

---

## Part I — Platform Vision

### 1. Mission
To engineer an enterprise-grade, high-assurance software operating system that decouples AI workload execution from monolithic cloud APIs, granting organizations sovereign ownership, cryptographically verified privacy, deterministic execution, and seamless distributed compute orchestration.

### 2. Vision
AEGIS aims to become the foundational operating layer for autonomous AI infrastructure—providing local, edge, and cluster execution capabilities with the reliability guarantees of mature server operating systems (such as Linux or Kubernetes) and the contract-driven extensibility of modern compiler infrastructures (such as LLVM).

### 3. Core Philosophy
* **Sovereignty First**: User data, session states, and local model weights must never leak outside designated node boundaries without explicit cryptographically signed consent.
* **Architecture Before Implementation**: Strict structural boundaries, explicit state machines, and typed interfaces take precedence over ad-hoc feature implementations.
* **Deterministic Contracts**: Every system subsystem communicates via contract interfaces (`IEngine`, `IMemoryGateway`, `ITool`, `IProvider`) with deterministic lifecycle semantics.
* **Zero Trust Security**: Compute tasks and capabilities operate under fine-grained permission boundaries inside isolated workspace sandboxes.

### 4. Engineering Principles
1. **Contract-Driven Modularization**: Subsystems are encapsulated as independent engines or providers loaded via IoC dependency containers.
2. **Asynchronous Non-Blocking I/O**: File I/O, IPC streaming, network RPCs, and token generation use event-driven, non-blocking asynchronous primitives.
3. **Atomic State Integrity**: All state modifications (memory writes, package installations, config updates) are transactional and support automatic rollback.
4. **Graceful Fault Isolation**: Subsystem failures are isolated via safe-mode boundaries; a crash in an auxiliary plugin or engine never compromises the core kernel.

### 5. Design Goals
* Sub-10ms microkernel boot overhead.
* Deterministic topological engine loading with circular dependency detection.
* High-assurance ACID-like cognitive memory persistence with automatic corruption quarantine and snapshot restoration.
* Multi-language SDK integration with zero protocol overhead across TypeScript, Python, Flutter/Dart, and Native C++.
* Seamless P2P overlay mesh networking with NAT traversal and WireGuard-grade ChaCha20-Poly1305 encryption.

### 6. Non-Goals
* AEGIS is **not** a single AI model or LLM architecture.
* AEGIS is **not** a simple wrapper around cloud chat endpoints.
* AEGIS does **not** rely on mandatory centralized cloud coordination nodes for peer discovery or consensus.

### 7. Long-Term Roadmap
* **Phase 1-3 (Core Platform Foundations)**: Microkernel, Cognitive Memory, Native C++ DIE Engine, REST & IPC Gateways *(Completed)*.
* **Phase 4-7 (Distributed Intelligence & Training)**: Swarm learning topologies, P2P weight aggregation (FedAvg/Gossip), encrypted AON tunnels *(Completed)*.
* **Phase 8-10 (Enterprise & Autonomous Workflows)**: Autonomous agent orchestrations, LoRA fine-tuning pipelines, subagent sandboxing *(Active)*.
* **Phase 11+ (Heterogeneous Hardware Synthesis)**: Native NPU/TPU hardware acceleration bindings and zero-copy intra-node IPC transport *(Planned)*.

### 8. Core Terminology
* **Microkernel**: The minimal TypeScript runtime supervisor managing configuration, events, engine lifecycles, and dependency injection.
* **Engine**: A managed, modular platform subsystem implementing the `IEngine` interface contract.
* **DIE (Distributed Intelligence Engine)**: The native C++20 background runtime executing cluster discovery, TCP transport, resource monitoring, and distributed task placement.
* **AIR (AI Runtime)**: The native C++ agent execution runtime responsible for prompt planning, workflow execution, and policy enforcement.
* **DIS (Distributed Inference Service)**: The native service managing prompt context assembly, model token streaming, and distributed inference routing.
* **Memory Gateway**: The central durable storage broker managing short-term working memory, long-term session history, and filesystem projections.
* **Provider**: A pluggable AI inference backend adapter (e.g., local GGUF, Ollama, remote OpenAI API).

### 9. Category Definition: What AEGIS Is and Is Not

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WHAT AEGIS IS                              │
├─────────────────────────────────────────────────────────────────────────┤
│ • An Enterprise AI Operating System                                     │
│ • A Microkernel-based Subsystem Orchestrator                            │
│ • A Native C++20 Distributed Compute & Inference Engine                 │
│ • A Transactional, Durable Cognitive Memory Infrastructure             │
│ • A Zero-Trust Capability & Sandboxed Tooling Ecosystem                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            WHAT AEGIS IS NOT                            │
├─────────────────────────────────────────────────────────────────────────┤
│ • A Standalone Chat Application UI                                      │
│ • A Proprietary Monolithic AI Model                                     │
│ • A Cloud-Bound SaaS Wrapper                                            │
│ • An Unstructured File Directory Script System                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part II — Architecture

### 1. Overall System Architecture
AEGIS uses a tiered architecture separating user applications, orchestration kernels, modular engines, and native compute runtimes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Layer 4)                        │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Desktop UI   │  │  REST API   │  │ AEGIS CLI   │  │ Admin Dash.  │  │
│  │ (Port 5001)  │  │ (Port 3005) │  │  (Terminal) │  │   (Web SPA)  │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
└─────────┼─────────────────┼────────────────┼────────────────┼───────────┘
          │                 │                │                │
┌─────────┼─────────────────┼────────────────┼────────────────┼───────────┐
│                      ENGINE LAYER (Layer 3)                             │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ Memory Engine   │  │  Agent Engine  │  │ REST API Engine          │  │
│  │ (priority: 5)   │  │ (priority: 10) │  │ (priority: 20)           │  │
│  └────────┬────────┘  └───────┬────────┘  └──────────┬───────────────┘  │
└───────────┼───────────────────┼──────────────────────┼──────────────────┘
            │                   │                      │
┌───────────┼───────────────────┼──────────────────────┼──────────────────┐
│                   RUNTIME KERNEL LAYER (Layer 2)                        │
│  Bootloader · KernelAPI · EngineManager · Typed EventBus                 │
│  ServiceRegistry · DI Container · IPC Control Channel                   │
│  RuntimeExecutor · RuntimeSessionManager · CapabilityManager            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ IPC Pipe / Socket
┌───────────────────────────────────┴─────────────────────────────────────┐
│             NATIVE C++20 DISTRIBUTED RUNTIME - DIE (Layer 1)            │
│  DistributedRuntime · NodeRuntime · DiscoveryManager · HeartbeatManager │
│  MembershipManager · TcpTransport (AON) · MessageBus · EventDispatcher │
│  ResourceManager · AIR (AI Runtime) · DIS (Distributed Inference)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Subsystem Boundaries and Responsibilities

#### 2.1 Microkernel Core & Runtime Kernel (`packages/aegis-runtime`)
The Runtime Kernel is the TypeScript execution root. It initializes the environment, parses runtime configurations, sets up dependency injection containers, and supervises engine lifecycles.
* **`Bootloader`**: Orchestrates the 5-phase startup sequence.
* **`EngineManager`**: Discovers, verifies, topologically sorts, and loads system engines.
* **`EventBus`**: Provides a strongly-typed in-memory pub-sub messaging system.
* **`ServiceRegistry`**: Acts as a central Service Locator for global runtime instances.
* **`RuntimeExecutor`**: Executes the agent ReAct reasoning loop, tool invocations, and session updates.

#### 2.2 Native Distributed Intelligence Runtime — DIE (`packages/aegis-distributed-intelligence`)
Implemented in **C++20**, the DIE (`die-service.exe`) handles low-latency multi-node discovery, peer heartbeats, resource telemetry collection, and network packet transport.
* **`DistributedRuntime`**: Master C++ root coordinator.
* **`TcpTransport`**: Low-level platform socket layer (`ws2_32` on Windows, BSD sockets on Linux).
* **`ResourceManager`**: Hardware telemetry collector (CPU, RAM, VRAM, CUDA capability metrics).
* **`AIR (aegis::air)`**: Native AI Runtime managing orchestrators, task planners, workflow engines, and agent pools.
* **`DIS (aegis::dis)`**: Distributed Inference Service managing inference sessions, context assembly, and token streaming.

#### 2.3 Cognitive Memory Engine (`packages/aegis-memory`)
Manages structured, resilient session persistence under `memory/`.
* **`MemoryGateway`**: Primary facade for session CRUD, history appending, and state recovery.
* **`MemoryWriteBuffer`**: Write-coalescing buffer that debounces filesystem updates over 5-second windows to prevent I/O bottlenecks.
* **`ProjectionGenerator`**: Synthesizes structured Markdown projections (`working-memory.md`, `session-memory.md`) within defined token limits.
* **`MemoryTransactionManager`**: Enforces ACID-like transactions (`beginTransaction`, `commit`, `rollback`).

#### 2.4 Package Manager (`packages/aegis-package-manager`)
Manages distribution packages (`.aeg`) and platform bundle deployments (`.aegbundle`). Guarantees transactional installation integrity, recovery journals, and rollbacks.

#### 2.5 SDK Architecture (`packages/aegis-sdk`)
Defines the client facade (`AegisSDK`) exposing clean APIs for session management, generation, memory access, and distributed cluster operations across multiple transport implementations.

---

## Part III — Architecture Decision Records (ADR)

### ADR-0001: Adoption of Microkernel Architecture
* **Status**: Accepted
* **Context**: AEGIS requires a high degree of modularity where engines, providers, and tools can be added, updated, or disabled without modifying core system logic.
* **Decision**: Adopt a strict Microkernel architecture where the kernel core provides only basic primitives (DI, event bus, engine loading, configuration) while all major features exist as decoupled `IEngine` implementations.
* **Alternatives Considered**: Monolithic runtime architecture, microservice-only architecture over HTTP.
* **Trade-offs**: Slightly increased initial startup abstraction; requires formal contracts (`IEngine`) for all subsystems.
* **Consequences**: Enables dynamic engine hot-reloading, isolated safe-mode booting, and clear subsystem domain separation.

### ADR-0002: Modular Runtime Kernel in TypeScript
* **Status**: Accepted
* **Context**: The upper orchestration layer requires rapid iteration, rich JSON manipulation, asynchronous event handling, and ecosystem compatibility with modern web and terminal tooling.
* **Decision**: Implement the Runtime Kernel in TypeScript (Node.js ESM environment) using strict type interfaces and asynchronous event streaming.
* **Alternatives Considered**: Pure C++ kernel, Go runtime, Python core.
* **Trade-offs**: Higher memory footprint compared to C++; requires IPC bridges to interface with native system processes.
* **Consequences**: Rapid developer iteration, cross-platform compatibility, and clean JSON payload serialization.

### ADR-0003: Physical Separation of AI Runtime (AIR) and Distributed Intelligence Runtime (DIR)
* **Status**: Accepted
* **Context**: High-performance multi-node compute and hardware resource tracking require native C++ performance, while cognitive workflow orchestration benefits from isolated native task scheduling abstractions.
* **Decision**: Partition the native runtime into two explicit sub-namespaces: `aegis::air` (AI Runtime for task scheduling and policy enforcement) and `aegis::dir` (Distributed Intelligence Runtime for network transport, membership, and STUN overlay networking).
* **Alternatives Considered**: Merging networking and agent orchestration into a single monolithic C++ class.
* **Trade-offs**: Clearer internal API boundaries at the cost of requiring explicit adapter interfaces (`TaskSchedulerAdapter`).
* **Consequences**: High modularity within C++; allows network transport implementations to be swapped or tested independently of agent logic.

### ADR-0004: Dual-Engine Stack (TypeScript Orchestration + Native C++ Compute)
* **Status**: Accepted
* **Context**: High-level workflow logic requires dynamic scripting, while distributed mesh networking, socket multiplexing, and GGUF inference require maximum raw compute efficiency.
* **Decision**: Implement a dual-engine model: TypeScript Node.js for high-level microkernel orchestration, and native C++20 for cluster-level distributed networking (DIE).
* **Alternatives Considered**: 100% C++ implementation or 100% Node.js implementation.
* **Trade-offs**: Requires IPC synchronization between Node.js process and `die-service.exe` binary.
* **Consequences**: Optimal balance of execution speed for networking/inference and development velocity for agent workflows.

### ADR-0005: IPC Transport via Platform Named Pipes and Local Sockets
* **Status**: Accepted
* **Context**: Communication between the Node.js daemon, native C++ process, and client SDKs on the same physical host must operate with minimal latency and zero external network exposure.
* **Decision**: Utilize native Named Pipes (`\\.\pipe\aegis-ipc` on Windows) and Unix Domain Sockets (`/tmp/aegis-ipc.sock` on POSIX systems) as the default local control transport.
* **Alternatives Considered**: Local HTTP REST polling, WebSockets, Shared Memory.
* **Trade-offs**: Requires platform-specific pipe abstractions in C++ and TypeScript.
* **Consequences**: Sub-millisecond local IPC control latency with robust OS-level ACL security.

### ADR-0006: Strongly-Typed EventBus Architecture
* **Status**: Accepted
* **Context**: Subsystems require loose coupling while retaining strict event payload validation.
* **Decision**: Implement a centralized `EventBus` class backed by typed event interfaces (`EventTypes.ts`), prohibiting unvalidated string-based event names.
* **Alternatives Considered**: Untyped `EventEmitter`, external message brokers (Redis, RabbitMQ).
* **Trade-offs**: System components must explicitly import and register event types in the core SDK.
* **Consequences**: Eliminates runtime event mismatches and provides structured telemetry trace points.

### ADR-0007: Transactional Package Installation Pipeline
* **Status**: Accepted
* **Context**: Installing or upgrading system extensions (`.aeg` packages) mid-operation risks corrupting the platform state if interrupted by crashes or disk errors.
* **Decision**: Implement a transactional installation pipeline featuring pre-install topological dependency checks, file backup staging, recovery journal logging, and automatic rollback on failure.
* **Alternatives Considered**: Direct unarchiving over existing directories without backups.
* **Trade-offs**: Additional disk writes during package installation for backup creation.
* **Consequences**: Complete platform stability guarantees; system automatically recovers to a consistent state following an interrupted installation.

### ADR-0008: Peer-to-Peer Mesh Overlay Architecture (AON)
* **Status**: Accepted
* **Context**: Cluster nodes must communicate securely across heterogeneous networks without relying on complex centralized VPN configurations or static public IP mappings.
* **Decision**: Embed a native private overlay network (AEGIS Overlay Network - AON) directly into the C++ transport layer using STUN/ICE NAT hole punching and Noise_IK / ChaCha20-Poly1305 encryption.
* **Alternatives Considered**: Mandating external VPN tools (Tailscale, WireGuard OS apps).
* **Trade-offs**: Increased implementation complexity within the C++ socket transport.
* **Consequences**: Zero-configuration, zero-trust secure node networking across firewalls and NATs.

---

## Part IV — Runtime Lifecycle

### 1. The 5-Phase Boot Sequence
The system boot sequence is managed by `Bootloader.boot()` in `packages/aegis-runtime/src/boot/Bootloader.ts`.

```
                  ┌─────────────────────────────────────────┐
                  │          SYSTEM BOOT TRIGGER            │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: ENVIRONMENT & HARDWARE DETECTION                               │
│ • Detect CPU core count, system RAM, OS platform, architecture          │
│ • Detect CUDA GPU compute capabilities                                  │
│ • Resolve absolute workspace sandbox path                               │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CONFIGURATION, LOGGING & EVENT BUS                             │
│ • ConfigurationManager loads and validates runtime.json                 │
│ • Load secure environment variables (OPENAI_API_KEY, secrets)          │
│ • Initialize StructuredLogger & global EventBus                         │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: DEPENDENCY INJECTION & SERVICE BINDING                         │
│ • Create IoC Container                                                  │
│ • Bind KernelAPI, EventBus, WorkspaceManager, EngineManager             │
│ • Populate ServiceRegistry IoC locator                                  │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: STORAGE RECOVERY & QUARANTINE VERIFICATION                     │
│ • Verify memory directory tree under memory/                            │
│ • Run TransactionManager uncommitted journal recovery check             │
│ • Scan for corrupted sessions -> move to memory/quarantine/             │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: ENGINE DISCOVERY, TOPOLOGICAL SORT & INITIALIZATION            │
│ • EngineManager scans engines/ directory for manifests                  │
│ • Compute load order via Topological Sort (DFS with cycle detection)    │
│ • Call engine.initialize() in topological order                         │
│ • Call engine.start() for autoStart=true engines                        │
│ • Start IPC Server control channel (Named Pipe / Domain Socket)         │
│ • Set KernelAPI status to ACTIVE                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Topological Dependency Resolution
Engine loading order is computed using a Depth-First Search (DFS) topological sort algorithm. If circular dependencies or missing engine requirements are detected, startup halts immediately with specific error codes (`ENGN-4001` or `ENGN-4002`).

```
Engine Dependents Tree Example:
aegis-memory (priority: 5, deps: [])
    └── aegis-agent (priority: 10, deps: [aegis-memory])
            └── aegis-api (priority: 20, deps: [aegis-agent, aegis-memory])

Computed Execution Order: aegis-memory ──> aegis-agent ──> aegis-api
```

### 3. Graceful Shutdown & Recovery Lifecycle
During platform teardown, `Bootloader.shutdown()` executes the reverse topological sequence:
1. IPC Server stops accepting new inbound connections.
2. `EngineManager.shutdownAll()` invokes `engine.shutdown()` in **reverse loading order** (`aegis-api` ──> `aegis-agent` ──> `aegis-memory`).
3. Memory write buffers are forcefully flushed to disk (`MemoryWriteBuffer.flush()`).
4. System releases file locks, terminates native child processes (`die-service.exe`), and emits `runtime.shutdown.completed`.

---

## Part V — Runtime State Machines

Every major AEGIS subsystem is governed by an explicit Finite State Machine (FSM).

### 1. Runtime Kernel State Machine

```
               ┌──────────────┐
               │ UNINITIALIZED│
               └──────┬───────┘
                      │ boot()
                      ▼
               ┌──────────────┐
               │ BOOTSTRAPPING│
               └──────┬───────┘
                      │ success
                      ▼
 ┌──────────┐  start() ┌──────────────┐  pause()  ┌──────────────┐
 │ RECOVERY │ ◄─────── │    ACTIVE    │ ────────► │    PAUSED    │
 └────┬─────┘          └──────┬───────┘ ◄──────── └──────────────┘
      │                       │ resume()
      │ crash / corrupt       │ shutdown()
      ▼                       ▼
 ┌──────────┐          ┌──────────────┐
 │ SAFE_MODE│          │  STOPPED     │
 └──────────┘          └──────────────┘
```

| Current State | Event | Target State | Action / Condition |
|---------------|-------|--------------|-------------------|
| `UNINITIALIZED` | `boot()` | `BOOTSTRAPPING` | Execute 5-phase startup pipeline. |
| `BOOTSTRAPPING` | `success` | `ACTIVE` | Register IPC channel, set kernel status ACTIVE. |
| `BOOTSTRAPPING` | `failure` | `SAFE_MODE` | Isolate failing engine, load safe core. |
| `ACTIVE` | `pause()` | `PAUSED` | Suspend engine processing queues. |
| `PAUSED` | `resume()` | `ACTIVE` | Resume task execution queues. |
| `ACTIVE` | `crash` | `RECOVERY` | Execute recovery journal rollback. |
| `ACTIVE` | `shutdown()`| `STOPPED` | Flush buffers, stop engines in reverse order. |

### 2. Cognitive Memory Session State Machine

```
  ┌──────────┐   create()   ┌──────────┐   delete()   ┌──────────┐
  │  INIT    │ ───────────► │  ACTIVE  │ ───────────► │  TRASH   │
  └──────────┘              └────┬─────┘              └────┬─────┘
                                 │ corruption              │ purge()
                                 ▼                         ▼
                            ┌──────────┐              ┌──────────┐
                            │QUARANTINE│              │ DELETED  │
                            └────┬─────┘              └──────────┘
                                 │ recover()
                                 ▼
                            ┌──────────┐
                            │ RECOVERED│ ───► ACTIVE
                            └──────────┘
```

### 3. Native C++ DIE Engine State Machine
Managed by `EngineLifecycle.ts` in TypeScript and `LifecycleManager.cpp` in native C++:
`OFFLINE` ──> `INITIALIZING` ──> `ONLINE` ──> `PAUSED` ──> `DEGRADED` ──> `STOPPING` ──> `OFFLINE`.

---

## Part VI — Public API Specification

### 1. API Tiering and Compatibility Matrix

| API Tier | Stability Guarantee | Breaking Change Policy | Target Audience |
|----------|---------------------|------------------------|-----------------|
| **Public** | Stable across major versions (SemVer). | Requires 6-month deprecation notice. | Application & SDK Developers |
| **Internal**| Module-private; subject to change. | No notice required; internal refactors. | Core Platform Engineers |
| **Experimental** | Subject to change based on feedback. | May change in minor releases with release notes. | Extension Developers |
| **Deprecated** | Maintained for backward compatibility. | Removed in next major release. | Legacy Integrations |

### 2. Thread Safety and Concurrency Guarantees
* **TypeScript Orchestration Layer**: Single-threaded event-driven async execution model. Race conditions on memory files are prevented via in-memory session locks (`SessionLockManager`).
* **Native C++ DIE Engine**: Multi-threaded with explicit mutex isolation (`std::shared_mutex`, `std::unique_lock`). Shared data structures (such as `NodeRegistry` and `ResourceCache`) support safe concurrent multi-reader, single-writer access.

### 3. Global Error Code Taxonomy
All errors returned by APIs, SDKs, or IPC channels contain a standardized string code:

| Error Code Range | Category | Subsystem Responsible |
|------------------|----------|----------------------|
| `ENGN-1000..1999` | Engine Lifecycle | `EngineManager` |
| `ENGN-4000..4999` | Dependency & Resolution | `Bootloader` / `RegistryLoader` |
| `MEM-2000..2999` | Memory Storage & Transaction | `MemoryGateway` / `MemoryTransactionManager` |
| `NET-3000..3999` | Network & Transport | `TcpTransport` / `AON Overlay` |
| `SEC-5000..5999` | Security & Capabilities | `SecurityManager` / `CapabilityManager` |
| `PKG-6000..6999` | Package Management | `PackageManager` |

---

## Part VII — SDK Reference (`@aegis/sdk`)

The `@aegis/sdk` package provides a multi-language programming facade over the platform.

### 1. Initialization Modes

```typescript
import { AegisSDK } from '@aegis/sdk';

// 1. Loopback Mode (In-process microkernel binding; optimized for desktop/embedded execution)
const aegisLocal = await AegisSDK.initialize({ transport: 'loopback' });

// 2. IPC Pipe Mode (Connects to background system daemon via Named Pipe / IPC socket)
const aegisDaemon = await AegisSDK.initialize({ transport: 'ipc', pipePath: '\\\\.\\pipe\\aegis-ipc' });
```

### 2. `IKernelAPI` Interface Reference

```typescript
export interface IKernelAPI {
  // Session Management
  createSession(sessionId: string, tags?: string[], actor?: string): Promise<SessionMetadata>;
  loadSession(sessionId: string, actor?: string): Promise<SessionMetadata>;
  checkoutSession(sessionId: string): Promise<boolean>;
  deleteSession(sessionId: string, actor?: string): Promise<boolean>;

  // History & Memory
  appendHistory(sessionId: string, role: string, content: string, metadata?: Record<string, any>, actor?: string): Promise<void>;
  getHistory(sessionId: string, actor?: string): Promise<HistoryItem[]>;
  updateWorkingMemory(sessionId: string, content: string, actor?: string): Promise<void>;

  // AI Inference & Streaming
  generate(options: { sessionId?: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<{ text: string }>;
  stream(options: { sessionId?: string; prompt: string; onToken: (token: string) => void }): Promise<void>;

  // Cluster & Learning Operations
  getClusterNodes(): Promise<NodeInfo[]>;
  createLearningRound(strategyName: string, config?: Record<string, any>): Promise<LearningRound>;
  joinLearningRound(roundId: string, leaderId: string): Promise<boolean>;
}
```

### 3. Multi-Language Code Examples

#### 3.1 TypeScript / Node.js
```typescript
import { AegisSDK } from '@aegis/sdk';

async function main() {
  const aegis = await AegisSDK.initialize({ transport: 'loopback' });
  await aegis.createSession('session-ts-01', ['production', 'demo']);
  
  await aegis.stream({
    sessionId: 'session-ts-01',
    prompt: 'Summarize platform architecture principles.',
    onToken: (token) => process.stdout.write(token)
  });
}
main();
```

#### 3.2 Python Client Integration
```python
import requests
import json
import sys

class AegisClient:
    def __init__(self, endpoint="http://localhost:3005"):
        self.endpoint = endpoint

    def stream_chat(self, prompt: str, session_id: str = "default"):
        url = f"{self.endpoint}/api/v1/chat"
        payload = {"sessionId": session_id, "prompt": prompt, "stream": True}
        response = requests.post(url, json=payload, stream=True)
        
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data:'):
                    data = json.loads(decoded[5:])
                    if 'text' in data:
                        sys.stdout.write(data['text'])
                        sys.stdout.flush()

if __name__ == "__main__":
    client = AegisClient()
    client.stream_chat("Explain high-assurance memory transactions.")
```

#### 3.3 Flutter / Dart Mobile & Desktop Integration
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AegisService {
  final String host = 'http://localhost:3005';

  Stream<String> streamChat(String prompt, String sessionId) async* {
    final request = http.Request('POST', Uri.parse('$host/api/v1/chat'));
    request.headers['Content-Type'] = 'application/json';
    request.body = jsonEncode({'sessionId': sessionId, 'prompt': prompt, 'stream': true});

    final client = http.Client();
    final response = await client.send(request);

    await for (final chunk in response.stream.transform(utf8.decoder)) {
      for (final line in chunk.split('\n')) {
        if (line.startsWith('data:')) {
          final jsonPayload = jsonDecode(line.substring(5));
          if (jsonPayload.containsKey('text')) {
            yield jsonPayload['text'] as String;
          }
        }
      }
    }
  }
}
```

#### 3.4 Native C++ Integration
```cpp
#include "aegis/die/runtime/DistributedRuntime.hpp"
#include <iostream>
#include <memory>

int main() {
  auto runtime = aegis::die::runtime::createRuntime();
  runtime->initialize();
  runtime->start();

  std::cout << "AEGIS Native Node Online. ID: " << runtime->getLocalNodeId() << std::endl;
  
  // Keep alive & monitor node state
  while (runtime->isOnline()) {
    std::this_thread::sleep_for(std::chrono::seconds(1));
  }
  
  runtime->shutdown();
  return 0;
}
```

---

## Part VIII — Protocol Specifications

### 1. Inter-Process Communication (IPC) Protocol
* **Framing**: Message length-prefixed JSON frames over IPC pipes.
* **Header Format**: 4-byte unsigned big-endian integer representing payload length, followed by UTF-8 encoded JSON string payload.

```
┌───────────────────────────┬─────────────────────────────────────────────┐
│ Length Header (4 Bytes)   │ Payload (N Bytes UTF-8 JSON)                │
│ [ 0x00, 0x00, 0x01, 0x20 ] │ { "jsonrpc": "2.0", "method": "status", ... }│
└───────────────────────────┴─────────────────────────────────────────────┘
```

### 2. Transport Layer Framing (TCP / AON Overlay)
Native cluster communications send binary frames over raw TCP sockets wrapped in Noise_IK transport encryption.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├───────────────────────────────┼───────────────────────────────┤
│        Magic (0x41, 0x45)     │        Version (0x01)         │
├───────────────────────────────┴───────────────────────────────┤
│                        Message Type ID                        │
├───────────────────────────────────────────────────────────────┤
│                        Payload Length                         │
├───────────────────────────────────────────────────────────────┤
│                        Sequence Counter                       │
├───────────────────────────────────────────────────────────────┤
│                  Encrypted Payload Bytes ...                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 3. Package Format Specification (`.aeg`)
A `.aeg` package is a standard ZIP archive structured as follows:

```
package.aeg
├── engine.json         # Package manifest specification
├── dist/
│   ├── index.js        # Compiled JavaScript entrypoint
│   └── native/         # (Optional) Pre-compiled C++ platform binaries
└── assets/             # Schemas, templates, and static assets
```

### 4. Manifest Format (`engine.json`)

```json
{
  "$schema": "https://aegis.dev/schemas/engine.v1.json",
  "id": "aegis-custom-analytics",
  "displayName": "Custom Analytics Engine",
  "version": "1.0.0",
  "kernelApiVersion": "1.0.0",
  "entrypoint": "dist/index.js",
  "dependencies": ["aegis-memory"],
  "priority": 15,
  "autoStart": true,
  "singleton": true,
  "permissions": ["fs:read", "net:listen"]
}
```

---

## Part IX — Distributed Runtime

### 1. Architecture of AIR, DIR, and DIS
The native C++ runtime (`packages/aegis-distributed-intelligence`) manages multi-node coordination.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED RUNTIME SYSTEM (C++20)                   │
│                                                                         │
│  ┌────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │    aegis::dir (DIR)    │  │            aegis::air (AIR)           │  │
│  │  • Node Discovery      │  │  • Workflow Orchestrator              │  │
│  │  • STUN / Hole Punch   │  │  • Agent Lifecycle & Policy           │  │
│  │  • Heartbeat Manager   │  │  • Task Scheduler Adapter             │  │
│  │  • TCP Mesh Transport  │  │  • Knowledge & Prompt Manager         │  │
│  └───────────┬────────────┘  └───────────────────┬───────────────────┘  │
│              │                                   │                      │
│              └─────────────────┬─────────────────┘                      │
│                                │                                        │
│                                ▼                                        │
│                 ┌───────────────────────────────┐                       │
│                 │       aegis::dis (DIS)        │                       │
│                 │  • Inference Session Pool     │                       │
│                 │  • Token Streamer             │                       │
│                 │  • Prompt Context Assembler   │                       │
│                 └───────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Distributed Learning Topologies

1. **Federated Strategy (FedAvg)**: Private local dataset training on Client nodes; model weight deltas (.safetensors) are uploaded to an Aggregator node for FedAvg math pooling.
2. **Swarm Strategy (P2P Consensus)**: Fully decentralized; automated leader election dynamically designates an Aggregator node per learning round based on availability and node reputation.
3. **Hierarchical Strategy**: Edge devices push updates to regional servers, which merge and sync with the cluster leader.
4. **Gossip Strategy**: Asynchronous peer-to-peer pairwise weight exchanges without a centralized round sync.

### 3. Automated Leader Election Algorithm
In Swarm mode, Aggregators are selected per round using deterministic node ranking based on SHA-256 hash consensus and trust metrics:

$$\text{Score}(N_i) = w_1 \cdot \text{TrustScore}(N_i) + w_2 \cdot \text{Availability}(N_i) - w_3 \cdot \text{LatencyMs}(N_i)$$

The node achieving the highest score assumes the Aggregator role for the duration of the training epoch.

---

## Part X — Security Architecture

### 1. Threat Model & Trust Boundaries
AEGIS protects against unauthorized data exfiltration, malicious tool execution, package tampering, and unauthenticated node spoofing.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          UNTRUSTED PUBLIC NETWORK                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Noise_IK Handshake & STUN
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     AEGIS OVERLAY NETWORK (AON TUNNEL)                  │
│                     Authenticated ChaCha20-Poly1305                     │
├─────────────────────────────────────────────────────────────────────────┤
│                          NODE TRUST BOUNDARY                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Capability Security Manager                   │  │
│  │ Enforces: fs:read, fs:write, process:spawn, net:listen permissions│  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      WORKSPACE SANDBOX DIRECTORY                  │  │
│  │ File I/O strictly confined to c:\aegis\workspace\                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Capabilities & Permissions Matrix

| Permission String | Capability Description | Subsystem Guarded |
|-------------------|────────────────────────|-------------------|
| `fs:read` | Read files within workspace sandbox path. | `FileTool`, `MemoryGateway` |
| `fs:write` | Modify or write files within workspace sandbox path. | `FileTool`, `WorkspaceManager` |
| `process:spawn` | Execute OS shell commands or child processes. | `TerminalTool`, DIE Supervisor |
| `net:listen` | Bind local network ports (e.g. 3005, 5001). | `ApiServer`, HTTP Listeners |
| `network:tcp` | Open outbound TCP sockets to remote peers. | `TcpTransport`, AON Mesh |
| `*` | Full administrative system access. | Core Bootloader |

---

## Part XI — Performance Engineering

### 1. Performance Targets & SLA

| Metric | Target SLA | Benchmark Measurement |
|--------|------------|-----------------------|
| Microkernel Boot Time | $< 15\text{ ms}$ | `Bootloader.boot()` duration |
| Local IPC Command Roundtrip | $< 1.5\text{ ms}$ | Pipe request-response latency |
| First Token Latency (Local GGUF) | $< 250\text{ ms}$ | Time to first SSE chunk |
| Memory Write Coalescing Window | $5.0\text{ s}$ | Debounce interval before disk flush |
| Maximum Session History Load Time | $< 8\text{ ms}$ | Reading cached session `history.json` |

### 2. Memory Write Coalescing Pipeline
To prevent disk I/O thrashing during token streaming, writes are queued in `MemoryWriteBuffer`:

```
Token Stream Events ──► Append to Memory Cache ──► Mark Session Dirty
                                                          │
                                                          ▼ (5-second debounce)
                                                 Execute Batch Disk Write
```

---

## Part XII — Reliability Engineering

### 1. Fault Tolerance & Circuit Breakers
Remote calls and provider invocations are wrapped in circuit breakers (`CircuitBreaker.ts`). If a model backend fails 3 consecutive requests, the circuit breaker opens, routing traffic to a secondary local fallback provider for a 30-second reset timeout.

### 2. Transactional Recovery & Journaling
All state modifications write an active transaction journal file (`transactions/<txId>_journal.json`). If a system crash occurs mid-write, the bootloader's `TransactionManager` detects uncommitted journals during Phase 4 startup and performs an automatic file rollback from `backups/<txId>/`.

---

## Part XIII — Observability

### 1. Structured JSON Logging Architecture
All runtime logs are emitted in JSON format via `StructuredLogger.ts`:

```json
{
  "timestamp": "2026-07-20T16:45:00.123Z",
  "level": "INFO",
  "subsystem": "EngineManager",
  "eventId": "ENGN-1002",
  "message": "Engine initialized successfully",
  "context": {
    "engineId": "aegis-memory",
    "initDurationMs": 4.2
  }
}
```

### 2. Telemetry Tracing & Health Probes
* Health Endpoint: `GET /api/health` ──> returns `{ status: "HEALTHY", version: "1.0.0", uptimeSeconds: 312.4 }`.
* Subsystem probes query individual engine health via `engine.health()`.

---

## Part XIV — Developer Guide

### 1. Creating a Custom Engine (`IEngine`)

Step 1: Implement `IEngine` contract in TypeScript:

```typescript
import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';

export class CustomAnalyticsEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'custom-analytics',
    displayName: 'Custom Analytics Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['aegis-memory'],
    priority: 15,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read']
  };

  async initialize(ctx: IRuntimeContext_v1): Promise<void> {
    ctx.logger.info('Initializing Custom Analytics Engine');
  }

  async start(): Promise<void> {}
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async reload(): Promise<void> {}
  async dispose(): Promise<void> {}

  async health(): Promise<EngineHealthReport> {
    return { status: 'HEALTHY', latencyMs: 0.5, details: {} };
  }
}
```

Step 2: Place `manifest.json` under `workspace/engines/custom-analytics/manifest.json`.

---

## Part XV — Compatibility Policy

### 1. Semantic Versioning Standards
AEGIS strictly follows **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):
* `MAJOR`: Breaking changes to public interfaces, kernel contracts, or binary wire formats.
* `MINOR`: Backward-compatible feature additions or new engine interfaces.
* `PATCH`: Backward-compatible bug fixes and internal refactorings.

---

## Part XVI — Governance

### 1. RFC & Architecture Review Process
Proposed architectural modifications must be documented in an Architecture Decision Record (ADR) submitted to `docs/adr/`. ADRs require formal technical review and unanimous sign-off by platform maintainers before implementation begins.

---

## Part XVII — Engineering Standards

### 1. Code Style Guidelines
* **TypeScript**: ESM modules mandatory (`import/export`). No `require()`. Strict null checks enabled in `tsconfig.json`.
* **C++**: **C++20 standard** (`-std=c++20`). Class names in `PascalCase`, member variables prefixed with `m_`, raw pointers prohibited in favor of `std::unique_ptr` and `std::shared_ptr`.

---

## Part XVIII — Appendices

### Appendix A: Glossary of Terms
* **AON**: AEGIS Overlay Network — native encrypted peer mesh.
* **DIE**: Distributed Intelligence Engine — native C++ background supervisor.
* **AIR**: AI Runtime — native agent scheduling and task planning subsystem.
* **DIS**: Distributed Inference Service — streaming prompt/token service.
* **IEngine**: Core contract interface for all platform engines.

### Appendix B: Master Error Code Reference Table

| Error Code | Human Readable Message | Resolution Action |
|------------|------------------------|-------------------|
| `ENGN-4001` | Missing required engine dependency. | Install missing engine package. |
| `ENGN-4002` | Circular dependency detected in engine registry. | Resolve dependency graph cycles. |
| `MEM-2001` | Session corruption detected during storage load. | Automatic quarantine restore. |
| `NET-3005` | TCP Overlay handshake failed / authentication error. | Verify peer public keys. |
| `SEC-5001` | Capability permission denied. | Grant required permission string. |

---

*Handcrafted for the AEGIS Platform Infrastructure Team. End of Specification.*
