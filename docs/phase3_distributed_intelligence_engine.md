# Phase 3: Distributed Intelligence Engine (DIE) Specification

The Distributed Intelligence Engine is the high-performance, native C++ networking core of the AEGIS platform, managing P2P discovery, state transitions, task queues, and transport sockets.

---

## 1. Native C++ Service Architecture

The service compiles into a native daemon (`die-service.exe`) utilizing standard C++20 conventions. The component structure includes:

```
cpp/src/
  ├── service/          - DieService entrypoint managing bootstrap.
  ├── transport/        - TcpTransport sockets handling raw message routing.
  ├── discovery/        - DiscoveryManager managing P2P discovery protocols.
  ├── lifecycle/        - StateTransition and LifecycleManager modules.
  ├── resource-manager/ - ResourceManager mapping CPU/GPU capacity.
  └── scheduler/        - WorkerPool executing parallel tasks.
```

---

## 2. Peer Discovery & TcpTransport

- **Discovery Manager**: Regularly broadcasts node advertisements and listens on configured ports to discover active peer nodes. It maintains a secure directory of verified online peers.
- **TcpTransport**: Implements a cross-platform socket listener (using Windows WinSock `ws2_32` or Linux `sys/socket`) that establishes persistent, encrypted TLS connections between nodes. It handles packet serialization, compression, and frame parsing.

---

## 3. Lifecycle State Machine

The C++ daemon utilizes a structured state machine:

```
[ OFFLINE ] ──( Start )──> [ BOOTSTRAP ] ──( Discover Peers )──> [ RUNNING ]
                                                                     │
    [ DEGRADED ] <──( Heartbeat Loss )── [ RUNNING ] <───────────────┘
```

The `LifecycleManager` coordinates these transitions and propagates events (such as `StateTransition`) to the TypeScript runtime over local IPC ports.

---

## 4. Task Scheduling & Schedulers

- **WorkerPool**: Spawns a configured pool of worker threads matched to the host machine's physical core count.
- **Scheduler**: Allocates sub-tasks to workers or delegates them to remote peers based on their live capability profiles and available hardware allocations.
