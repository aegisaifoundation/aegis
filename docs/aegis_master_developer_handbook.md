# AEGIS Architecture & SDK Master Developer Handbook

> **Version:** 1.0.0  
> **Target Audience:** System Architects, Distributed Systems Engineers, AI Developers, App Builders  
> **Scope:** Microkernel Architecture, SDK, Engines, REST APIs, Tools/Skills, Distributed Intelligence, Federated & Swarm Learning, Multi-Language Client Implementations (Python, Flutter, TypeScript, C++), and Custom Engine Extension.

---

## Table of Contents
1. [Architecture Overview & Microkernel Design](#1-architecture-overview--microkernel-design)
2. [AEGIS SDK Reference (`@aegis/sdk`)](#2-aegis-sdk-reference-aegissdk)
3. [Cognitive Memory Engine (`aegis-memory`)](#3-cognitive-memory-engine-aegis-memory)
4. [AI Agent Engine & Subagents (`aegis-agent`)](#4-ai-agent-engine--subagents-aegis-agent)
5. [Tools & Skills Ecosystem (`@aegis/tools`, `@aegis/skills`)](#5-tools--skills-ecosystem-aegistools-aegisskills)
6. [Distributed Intelligence Engine (`distributed-intelligence` / C++ DIR)](#6-distributed-intelligence-engine-distributed-intelligence--c-dir)
7. [Secure Collaboration & Consensus (`aegis-collaboration`)](#7-secure-collaboration--consensus-aegis-collaboration)
8. [Distributed & Federated Learning Engine (`aegis-distributed-learning`)](#8-distributed--federated-learning-engine-aegis-distributed-learning)
9. [AEGIS Data Engine & Privacy Scrubber (`aegis-data`)](#9-aegis-data-engine--privacy-scrubber-aegis-data)
10. [REST API & SSE Streaming Reference (`aegis-api`)](#10-rest-api--sse-streaming-reference-aegis-api)
11. [Multi-Language Client Implementation Guides](#11-multi-language-client-implementation-guides)
    - [11.1 TypeScript / Node.js](#111-typescript--nodejs)
    - [11.2 Python Client & Training Integration](#112-python-client--training-integration)
    - [11.3 Flutter / Dart Mobile & Desktop Integration](#113-flutter--dart-mobile--desktop-integration)
    - [11.4 Native C++ Integration](#114-native-c-integration)
12. [Building Applications on Top of AEGIS](#12-building-applications-on-top-of-aegis)
13. [Creating & Registering Custom Platform Engines (`IEngine`)](#13-creating--registering-custom-platform-engines-iengine)
14. [Modifying & Extending the AEGIS SDK](#14-modifying--extending-the-aegis-sdk)

---

## 1. Architecture Overview & Microkernel Design

AEGIS is a **High-Assurance Distributed Intelligence Infrastructure**. It is designed around a modular **Microkernel Core** that orchestrates pluggable engines via strict lifecycle contracts, dependency topological sorting, and asynchronous event buses.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AEGIS SDK & API Gateway Layer                       │
├─────────────────────────────────────────────────────────────────────────┤
│                          Microkernel Core                               │
│     (EngineManager, ServiceRegistry, EventBus, WorkspaceManager)        │
├───────────────┬─────────────────┬───────────────────┬───────────────────┤
│ aegis-memory  │   aegis-agent   │ distributed-intel │ aegis-data / ATE  │
│(Cognitive Mgt)│ (ReAct Agents)  │  (Native C++ DIR) │ (Privacy/Training)│
└───────────────┴─────────────────┴───────────────────┴───────────────────┘
```

### Key Architectural Standards:
* **Contract-Driven**: Every engine implements the `IEngine` contract.
* **Deterministic Lifecycle**: Engines initialize, configure, start, pause, resume, and shutdown in topological priority order.
* **Isolated Subsystems**: Subsystems communicate strictly via `serviceRegistry` interfaces or the typed `EventBus`.

---

## 2. AEGIS SDK Reference (`@aegis/sdk`)

The SDK provides a clean programming facade over all platform capabilities.

### 2.1 Initialization Modes
```typescript
import { AegisSDK } from '@aegis/sdk';

// Loopback Mode (In-process execution; fastest for single scripts)
const aegis = await AegisSDK.initialize({ transport: 'loopback' });

// IPC Pipe Mode (Connects to background daemon over IPC pipe)
const aegisIPC = await AegisSDK.initialize({ transport: 'ipc' });
```

### 2.2 Core SDK Method Signature Reference

```typescript
export interface IKernelAPI {
  // Session & Memory
  createSession(sessionId: string, tags?: string[], actor?: string): Promise<SessionMetadata>;
  loadSession(sessionId: string, actor?: string): Promise<SessionMetadata>;
  appendHistory(sessionId: string, role: string, content: string, metadata?: Record<string, any>, actor?: string): Promise<void>;
  getHistory(sessionId: string, actor?: string): Promise<any[]>;
  updateWorkingMemory(sessionId: string, content: string, actor?: string): Promise<void>;
  deleteSession(sessionId: string, actor?: string): Promise<boolean>;

  // AI Inference & Generation
  generate(options: { sessionId?: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<{ text: string }>;
  stream(options: { sessionId?: string; prompt: string; onToken: (token: string) => void }): Promise<void>;

  // Data & Training
  createDataset(datasetId: string, sourcePath: string): Promise<any>;
  prepareDataset(datasetId: string, options?: any): Promise<any>;
  createTrainingJob(jobId: string, datasetId: string, config: any): Promise<any>;
  exportLoRA(jobId: string, loraId: string): Promise<string>;

  // Distributed Network & Learning
  getClusterNodes(): Promise<string[]>;
  createLearningRound(strategyName: string, config?: any): Promise<any>;
  joinLearningRound(roundId: string, leaderId: string): Promise<boolean>;
}
```

---

## 3. Cognitive Memory Engine (`aegis-memory`)

The memory engine provides structured, resilient memory across 8 dedicated filesystem locations under `memory/`:

```
memory/
├── sessions/<sessionId>/
│   ├── working-memory.md       # Short-term active turn context (goals, tasks)
│   ├── session-memory.md       # Long-term stable facts & user preferences
│   ├── history.json            # Full multi-turn conversation history
│   ├── session-state.json      # Checkpoints, objectives & state tracking
│   └── metadata.json           # Timestamps, tags, SHA-256 checksums
├── snapshots/<sessionId>/      # Versioned backups created prior to compaction
├── trash/<sessionId>/          # Soft-deleted sessions pending erasure
└── quarantine/<sessionId>/     # Corrupted sessions isolated for self-repair
```

### Key Capabilities:
* **`MemoryWriteBuffer`**: Coalesces disk writes over 5-second intervals to prevent I/O thrashing during streaming.
* **`ProjectionGenerator`**: Builds focused markdown projections (`working-memory.md`) within strict token budgets (~1000 words).
* **`MemoryTransactionManager`**: Provides ACID transaction `beginTransaction()`, `registerWrite()`, `commit()`, and `rollback()`.
* **Quarantine Recovery**: Detects corrupted JSON files and restores data automatically from versioned snapshots.

---

## 4. AI Agent Engine & Subagents (`aegis-agent`)

The Agent Engine coordinates ReAct reasoning loops, subagent instantiation, and tool execution.

### 4.1 Subagent Spawning Flow
Parent agents delegate specialized tasks to isolated child subagents:

```typescript
import { AgentFactory } from '@aegis/agent';

// Spawning a specialized Coder Subagent
const subagent = AgentFactory.createAgent({
  role: 'CoderSubAgent',
  parentSessionId: 'main-session',
  allowedTools: ['file-read', 'file-write'],
  maxSteps: 5
});

// Runs in an isolated sandbox directory: memory/sessions/<sessionId>/sandboxes/<subagentId>/
const result = await subagent.execute({ prompt: 'Implement binary search in C++' });
```

---

## 5. Tools & Skills Ecosystem (`@aegis/tools`, `@aegis/skills`)

### 5.1 Registering a Custom Tool (`ITool`)
```typescript
import { toolRegistry, ITool } from '@aegis/tools';

export class CustomCalculatorTool implements ITool {
  name = 'calculator';
  description = 'Performs mathematical calculations';

  async execute(params: { expression: string }): Promise<string> {
    const result = eval(params.expression); // Execute math logic
    return String(result);
  }
}

// Register tool globally
toolRegistry.register(new CustomCalculatorTool());
```

### 5.2 Registering a Skill (`ISkill`)
Skills encapsulate multi-step domain capabilities (e.g. `GitSkill`, `DatabaseMigrationSkill`):

```typescript
import { skillRegistry } from '@aegis/skills';

skillRegistry.register({
  name: 'code-review-skill',
  description: 'Audits source code for security vulnerabilities',
  toolsRequired: ['file-read', 'linter'],
  execute: async (context) => {
    // Multi-step skill execution logic
  }
});
```

---

## 6. Distributed Intelligence Engine (`distributed-intelligence` / C++ DIR)

The DIR is built in native **C++20** (`die-service.exe`) to deliver high-assurance distributed execution, node identity, heartbeats, and TCP transport.

### 6.1 C++ Architecture & Subsystems
* **`DistributedRuntime`**: Root C++ coordinator object.
* **`HeartbeatManager`**: Tracks liveness signals and ping latencies across nodes.
* **`NodeRegistry`**: In-memory cluster node membership table.
* **`TcpTransport`**: Raw TCP socket transport layer (`ws2_32` on Windows).
* **AIR (`aegis::air`)**: Native AI Runtime managing orchestrator, task planner, and worker pools.
* **DIS (`aegis::dis`)**: Distributed Inference Service managing prompt assembly and streaming.

---

## 7. Secure Collaboration & Consensus (`aegis-collaboration`)

Manages peer-to-peer capability discovery, trust metrics, encrypted AON tunnels, and consensus.

### 7.1 Reputation & Trust Metrics
`ReputationManager` tracks node reliability:

```typescript
const rep = collaborationEngine.Reputation('node-b');
console.log(`Trust Score: ${rep.trustScore}, Availability: ${rep.availabilityRate}`);
```

### 7.2 Encrypted Overlay Tunnel (AON STUN/ECDH)
Establishes virtual encrypted tunnels across NAT firewalls:

```typescript
const tunnel = await collaborationEngine.ConnectOverlayPeer('192.168.1.50', 8080);
console.log('Established AON Tunnel ID:', tunnel.id);
```

---

## 8. Distributed & Federated Learning Engine (`aegis-distributed-learning`)

Supports 4 network training topologies:

```
1. Federated Strategy (FedAvg)   ──► Data private locally, weight deltas merged by coordinator.
2. Swarm Strategy (P2P Consensus)──► Zero central server; dynamic leader election per round.
3. Hierarchical Strategy         ──► Sub-clusters (Edge devices ──► Regional Server ──► Leader).
4. Gossip Strategy               ──► Asynchronous peer-to-peer gradient exchange between pairs.
```

### 8.1 Automated Leader Election (`_electLeader()`)
In `swarm` mode, aggregator selection is 100% automated:

```typescript
// Dynamic leader selection in SwarmLearningStrategy.ts
private async _electLeader(round: LearningRound): Promise<void> {
  const allNodes = [this.context.localNodeId, ...round.participants].sort();
  // Elects node based on trust score, availability, or lowest hash
  this.electedLeaderId = allNodes[0];
}
```

---

## 9. AEGIS Data Engine & Privacy Scrubber (`aegis-data`)

Harvests workspace files and memory sessions while redacting PII and API credentials.

### 9.1 Data Connectors & Privacy Pipeline
```typescript
import { DataEngine } from '@aegis/data';

const dataEngine = new DataEngine();
await dataEngine.ImportDataset('ds-001', 'Medical Notes', 'user', 'Memory', 'private', {});

// Process dataset: Scrubber masks PII & API keys before exporting dataset.jsonl
await dataEngine.PrepareDataset('ds-001', {
  enablePIIMasking: true,
  enableCredentialFilter: true
});
```

---

## 10. REST API & SSE Streaming Reference (`aegis-api`)

The HTTP REST server listens on **`http://localhost:3005`**.

### Endpoints:

#### 10.1 Health Check
* **`GET /api/health`**
```json
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "uptimeSeconds": 312.4
}
```

#### 10.2 Create Session
* **`POST /api/sessions`**
* Body: `{"sessionId": "session-1", "tags": ["api"]}`

#### 10.3 AI Chat Turn (Server-Sent Events Streaming)
* **`POST /api/v1/chat`**
* Body:
```json
{
  "sessionId": "session-1",
  "prompt": "Write a TypeScript function.",
  "stream": true
}
```
* **Response Header**: `Content-Type: text/event-stream`
* **Data Stream Payload**: `data: {"text": "function "} \n\n`

---

## 11. Multi-Language Client Implementation Guides

### 11.1 TypeScript / Node.js
```typescript
import { AegisSDK } from '@aegis/sdk';

const aegis = await AegisSDK.initialize();
await aegis.createSession('demo');
const res = await aegis.generate({ prompt: 'Hello from Node.js!' });
console.log(res.text);
```

### 11.2 Python Client & Training Integration
```python
import requests
import json

class AegisClient:
    def __init__(self, host="http://localhost:3005"):
        self.host = host

    def stream_chat(self, prompt, session_id="default"):
        url = f"{self.host}/api/v1/chat"
        payload = {"sessionId": session_id, "prompt": prompt, "stream": True}
        response = requests.post(url, json=payload, stream=True)
        
        for line in response.iter_lines():
            if line and line.decode('utf-8').startswith('data:'):
                data = json.loads(line.decode('utf-8')[5:])
                print(data.get('text', ''), end='', flush=True)

# Usage
client = AegisClient()
client.stream_chat("Explain distributed computing.")
```

### 11.3 Flutter / Dart Mobile & Desktop Integration
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AegisFlutterService {
  final String host = 'http://localhost:3005';

  Stream<String> streamChat(String prompt) async* {
    final req = http.Request('POST', Uri.parse('$host/api/v1/chat'));
    req.headers['Content-Type'] = 'application/json';
    req.body = jsonEncode({'sessionId': 'flutter-session', 'prompt': prompt, 'stream': true});

    final client = http.Client();
    final res = await client.send(req);

    await for (final chunk in res.stream.transform(utf8.decoder)) {
      for (final line in chunk.split('\n')) {
        if (line.startsWith('data:')) {
          final data = jsonDecode(line.substring(5));
          if (data.containsKey('text')) {
            yield data['text'] as String; // Updates Flutter UI widget
          }
        }
      }
    }
  }
}
```

### 11.4 Native C++ Integration
```cpp
#include "aegis/die/runtime/DistributedRuntime.hpp"

int main() {
  auto runtime = aegis::die::runtime::createRuntime();
  runtime->initialize();
  runtime->start();
  
  // Register node & listen on TCP transport
  std::cout << "Native C++ Node Online." << std::endl;
  return 0;
}
```

---

## 12. Building Applications on Top of AEGIS

Whether building a Desktop UI (Electron/PyQt), Web Portal, or CLI tool:
1. Launch the Microkernel daemon: `npx tsx apps/aegis-cli/src/index.ts runtime start`
2. Connect using `AegisSDK.initialize({ transport: 'ipc' })` or HTTP endpoints.
3. Stream tokens directly into your UI widgets or terminal output buffers.

---

## 13. Creating & Registering Custom Platform Engines (`IEngine`)

To create a new engine:

1. **Implement `IEngine`**:
```typescript
import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';

export class MyCustomEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'my-custom-engine',
    displayName: 'My Custom Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: [],
    priority: 15,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read']
  };

  async initialize(ctx: IRuntimeContext_v1): Promise<void> {}
  async start(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async health(): Promise<EngineHealthReport> {
    return { status: 'HEALTHY', latencyMs: 0, details: {} };
  }
}
```

2. **Add `manifest.json` under `workspace/engines/my-custom-engine/manifest.json`**.
3. **Enable Engine via CLI**:
```bash
npx tsx apps/aegis-cli/src/index.ts engine enable my-custom-engine
```

---

## 14. Modifying & Extending the AEGIS SDK

To add a new API method to `@aegis/sdk`:

1. **Update `IKernelAPI.ts`**: Add method signature definition.
2. **Implement in `AegisSDK.ts`**: Add concrete method implementation.
3. **Rebuild SDK Package**:
```bash
npm run build --workspace=packages/aegis-sdk
```

---
*Handbook maintained by the Chief Systems Architect. AEGIS Platform v1.0.0.*
