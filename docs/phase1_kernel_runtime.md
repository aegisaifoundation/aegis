# Phase 1: AEGIS Kernel & Runtime Specification

The AEGIS Kernel is the foundational orchestrator of the entire platform, responsible for boot mechanics, engine registrations, service discoverability, IPC loops, and execution lifecycles.

---

## 1. Engine Lifecycles

Every module in the system implements the standard `IEngine` interface from `@aegis/sdk`:

```typescript
export interface IEngine {
  readonly metadata: IEngineMetadata;
  initialize(context: IRuntimeContext_v1): Promise<void>;
  configure(config: Record<string, any>): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reload(): Promise<void>;
  shutdown(): Promise<void>;
  dispose(): Promise<void>;
  health(): Promise<EngineHealthReport>;
}
```

### Lifecycle Transition States:
1. **UNINITIALIZED**: The engine class is instantiated but no context has been passed.
2. **INITIALIZED**: The `initialize()` hook completes, validating core parameters and dependencies.
3. **STARTED / ONLINE**: The `start()` hook triggers, launching background processors, transport sockets, or schedulers.
4. **PAUSED**: The engine pauses queue processing or network polling.
5. **STOPPED / OFFLINE**: The engine shuts down gracefully, releasing held memory, file handles, and sub-threads.

---

## 2. Core Service Registry

A central, thread-safe service registry is implemented at `@aegis/runtime`:

- **`serviceRegistry.register(id, instance)`**: Registers a service.
- **`serviceRegistry.get(id)`**: Fetches a registered instance.
- **`serviceRegistry.has(id)`**: Checks for registration without throwing errors.

This allows engines to cross-reference each other dynamically without introducing strict compile-time dependency loops.

---

## 3. IPC Loops & Event Bus

The runtime runs an event loop that coordinates inter-process calls (IPC) between Node, AI Runtime, and the P2P networking C++ daemon:
*   **Event Bus**: Emits key notifications (e.g., `task:completed`, `model:loaded`, `package:installed`).
*   **IPC Bus**: Standardized JSON-RPC messages routed over secure sockets (`DieService` and Node client) keeping all engines synced.
