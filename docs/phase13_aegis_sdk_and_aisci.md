# Phase 13: AEGIS SDK & AI System Call Interface (AISCI)

The **AEGIS Software Development Kit (ASDK)** and **AI System Call Interface (AISCI)** constitute the official application programming interface for the AEGIS platform. Applications interact strictly with the SDK wrapper, never calling engine interfaces directly.

---

## High-Level Architecture

```
Application ➔ AegisSDK (ASDK) ➔ AI System Call Interface (AISCI) ➔ Runtime Microkernel ➔ Engines
```

---

## AISCI System Call Executor

The SDK communicates with the microkernel via the `syscall()` boundary. A typical payload propagates session authentication and correlation headers:

```typescript
interface SyscallMessage {
  category: string;
  method: string;
  params: any;
  context: {
    correlationId: string;
    sessionId: string;
    userId: string;
  };
}
```

---

## Transport Abstraction Layer

Transports are decoupled from the API layer through the `ITransportClient` interface:
1. **IPC (Inter-Process Communication)**: Default low-latency channel for local desktop installations.
2. **REST**: Used for simple request/response system calls.
3. **WebSockets**: Used for long-lived bidirectional streams (events, streaming inference, training progress).
4. **gRPC**: Enterprise-grade cloud/microservice deployments.
5. **LoopbackTransport**: Routes requests directly to the microkernel `serviceRegistry` container (ideal for rapid integration tests).
6. **MockTransport**: Simulates microkernel returns for isolated unit tests.

---

## Unified Error Model

Platform-level failures are translated into strongly-typed language-agnostic exceptions:
* `RuntimeUnavailable`: The microkernel is offline.
* `NodeOffline`: Target peer node is unreachable.
* `PackageNotInstalled`: The required engine is not installed on the node.
* `EngineUnavailable`: The engine is registered but disabled.
* `FeatureUnavailable`: The requested system call is missing (enables Graceful Degradation).
* `PolicyViolation`: Action rejected due to policy constraints.
* `PermissionDenied`: Insufficient security credentials.
* `DatasetValidationFailed`: Ingested dataset validation failed.
* `TrainingFailed`: Optimizer execution failed.
* `InferenceFailed`: Model generation request failed.
* `NetworkTimeout`: Peer node timed out.
* `ConsensusFailed`: Swarm consensus agreement failed.
