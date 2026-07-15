# System Endpoints & Integration Specification

This document details how the AEGIS platform operates, exposes endpoints, and permits developers to connect custom Engines, Plugins, Skills, and Tools without modifying the core runtime code.

---

## 1. How AEGIS Works Internally

```
[ Developer SDK / CLI ] ──( Pack )──> [ .aeg Package Archive ]
                                                 │
                                           ( Install )
                                                 ▼
[ serviceRegistry ] <──( Register )── [ Package Manager Sandbox ]
        │
        ├── Hooks up to AI Runtime v2 (AIR v2)
        └── Hooks up to Collaboration Engine (ASCIP)
```

The core runtime serves as a dynamic service orchestrator. Everything else (custom code, algorithms, inference backends) is treated as a pluggable extension. 

By utilizing the dynamic `serviceRegistry`, custom engines, tools, or skills can expose their interfaces at runtime.

---

## 2. Dynamic Integration Patterns (No Runtime Modification Required)

### A. Registering a Custom Engine
Create a class implementing `IEngine` and write an `engine.json` manifest. The runtime automatically bootstrap-loads your engine and passes it the `IRuntimeContext_v1`. Inside your `initialize()` hook, register your API:

```typescript
import { serviceRegistry } from '@aegis/runtime';

export class CustomFeatureEngine implements IEngine {
  async initialize(context: IRuntimeContext_v1): Promise<void> {
    serviceRegistry.register('my-custom-feature', this);
  }
  // ... rest of lifecycle methods
}
```

### B. Registering a Custom Tool
Tools are connected by registering them inside the `toolRegistry` service (if available) or as standard skills:

```typescript
const toolRegistry = serviceRegistry.get<any>('toolRegistry');
toolRegistry.registerTool({
  id: 'my-custom-tool',
  description: 'Performs specialized data calculations',
  execute: async (input, context) => {
    // Custom tool logic here
    return JSON.stringify({ result: input.value * 2 });
  }
});
```

The AI Runtime's `ToolExecution` and `FunctionCall` APIs automatically query the `toolRegistry` dynamically, resolving and executing your tool without any core code changes!

---

## 3. Core System Endpoints

AEGIS exposes APIs over REST, gRPC, and WebSockets:

### A. REST APIs
*   **`POST /api/v1/inference/generate`**: Unary prompt generation.
*   **`POST /api/v1/inference/embeddings`**: Computes text embeddings.
*   **`GET /api/v1/packages/list`**: Lists installed packages.
*   **`POST /api/v1/packages/install`**: Installs an `.aeg` package.
*   **`GET /api/v1/node/status`**: Fetches CPU/GPU performance and trust score.

### B. WebSocket APIs (`ws://localhost:port/stream`)
*   **`stream:generate`**: Sends a prompt and streams back token chunks.
*   **`stream:cancel`**: Cancels an active generation stream.
*   **`stream:pause` / `stream:resume`**: Controls streaming flow.

### C. gRPC Services (DIE Daemon Interface)
*   `DieService.Ping(PingRequest) returns (PingResponse)`
*   `DieService.SubmitTask(TaskRequest) returns (TaskResponse)`
