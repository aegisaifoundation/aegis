# AEGIS — Event Bus Report
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

---

## 1. Overview

The AEGIS Event Bus is a **typed, domain-organized** publish-subscribe system built on Node.js `EventEmitter`. It serves as the backbone of decoupled communication across all system layers — from the boot sequence to the agent loop to memory operations.

---

## 2. Location & Files

```
packages/aegis-runtime/src/eventbus/
├── EventBus.ts        # EventEmitter wrapper (singleton)
├── EventTypes.ts      # 100+ typed event name constants
├── EventRegistry.ts   # Event metadata & handler registry
├── EventPayloads.ts   # Payload type definitions
└── index.ts           # Public exports
```

Also:
```
packages/aegis-memory/src/eventbus/
└── MemoryEventBus.ts  # Memory-domain scoped event bus
```

---

## 3. EventBus API

```typescript
class EventBus extends EventEmitter {
  emit(event: string, payload?: any, source?: string): void
  on(event: string, handler: (payload: any) => void): void
  off(event: string, handler: (payload: any) => void): void
  once(event: string, handler: (payload: any) => void): void
}

export const eventBus = new EventBus();  // Global singleton
```

---

## 4. Complete Event Type Reference

All event names are defined as constants in `EventTypes.ts`.

### 4.1 Execution Events (Agent Runtime)

| Constant | Event String | Payload |
|----------|-------------|---------|
| `EXECUTION_STARTED` | `execution_started` | `{ input: string }` |
| `MESSAGE_RECEIVED` | `message_received` | `{ role, content }` |
| `THINKING_STARTED` | — | `{}` |
| `THINKING_FINISHED` | — | `{}` |
| — | `response_chunk` | `{ chunk: string }` |
| — | `tool_started` | `{ toolName, input }` |
| — | `tool_finished` | `{ toolName, output }` |
| `EXECUTION_COMPLETED` | `execution_completed` | `{}` |
| — | `runtime_error` | `{ error: string }` |

### 4.2 Session Lifecycle Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `SESSION_CREATED` | `session.created` | New session created |
| `SESSION_LOADED` | `session.loaded` | Session metadata loaded |
| `SESSION_MOUNTED` | `session.mounted` | Active session fully loaded into cache |
| `SESSION_UNMOUNTED` | `session.unmounted` | Session evicted from active cache |
| `SESSION_MOUNT_FAILED` | `session.mount.failed` | Mount operation failed |
| `SESSION_CHECKOUT_STARTED` | `session.checkout.started` | Checkout operation beginning |
| `SESSION_CHECKOUT_COMPLETED` | `session.checkout.completed` | Checkout operation complete |
| `SESSION_DELETED` | `session.deleted` | Session soft-deleted (moved to trash) |
| `SESSION_ARCHIVED` | `session.archived` | Session archived |
| `SESSION_FORKED` | `session.forked` | Session forked to new branch |
| `SESSION_RENAMED` | `session.renamed` | Session displayName changed |
| `SESSION_RESTORED` | `session.restored` | Session recovered from trash |
| `SESSION_QUARANTINED` | `session.quarantined` | Session moved to quarantine (corruption) |

### 4.3 Memory Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `MEMORY_READ` | `memory.read` | Memory entity read |
| `MEMORY_UPDATED` | `memory.updated` | Memory entity written |
| `MEMORY_DELETED` | `memory.deleted` | Memory entity deleted |
| `MEMORY_FAILED` | `memory.failed` | Memory I/O operation failed |
| `MEMORY_INITIALIZED` | `memory.initialized` | Memory subsystem ready |
| `MEMORY_LOADED` | `memory.loaded` | Memory snapshot loaded |
| `MEMORY_REFINED` | `memory.refined` | Memory compressed/pruned |
| `MEMORY_COMPRESSED` | `memory.compressed` | Memory compressed |
| `MEMORY_PRUNED` | `memory.pruned` | Memory pruned |
| `MEMORY_CORRUPTED` | `memory.corrupted` | Checksum mismatch detected |
| `MEMORY_RESTORED` | `memory.restored` | Corruption recovered |
| `MEMORY_LOCKED` | `memory.locked` | Memory lock acquired |
| `MEMORY_SNAPSHOT_CREATED` | `memory.snapshot.created` | Snapshot created |
| `MEMORY_VALIDATION_FAILED` | `memory.validation.failed` | Validation error |
| `WORKING_MEMORY_EXPIRED` | `working-memory.expired` | Working memory TTL exceeded |

### 4.4 Runtime State Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `RUNTIME_STARTED` | `runtime_started` | Runtime fully initialized |
| `RUNTIME_SHUTDOWN` | `runtime_shutdown` | Shutdown initiated |
| `RUNTIME_STATE_LOADED` | `runtime.state.loaded` | Runtime state file read |
| `RUNTIME_STATE_PERSISTED` | `runtime.state.persisted` | Runtime state written to disk |
| `RUNTIME_SESSION_CHANGED` | `runtime.session.changed` | Active session switched |
| `RUNTIME_MODE_CHANGED` | `runtime.mode.changed` | Runtime mode changed |
| `RUNTIME_CLUSTER_CHANGED` | `runtime.cluster.changed` | Cluster topology changed |

### 4.5 Runtime Health & Hardening Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `RUNTIME_HEALTH_CHANGED` | `runtime.health.changed` | Health status changed |
| `RUNTIME_CRASH_DETECTED` | `runtime.crash.detected` | Abnormal termination detected |
| `RUNTIME_SAFE_MODE_ENTERED` | `runtime.safe_mode.entered` | Boot entered safe mode |
| `RUNTIME_HEARTBEAT_UPDATED` | `runtime.heartbeat.updated` | Heartbeat timestamp refreshed |
| `RUNTIME_HEARTBEAT_STALE` | `runtime.heartbeat.stale` | Watchdog detected stale heartbeat |
| `RUNTIME_LOCK_ACQUIRED` | `runtime.lock.acquired` | Distributed lock taken |
| `RUNTIME_LOCK_RELEASED` | `runtime.lock.released` | Distributed lock released |
| `RUNTIME_TIMEOUT_TRIGGERED` | `runtime.timeout.triggered` | Operation timed out |
| `RUNTIME_MOUNT_GENERATION_CHANGED` | `runtime.mount.generation.changed` | Mount generation incremented |
| `RUNTIME_IDENTITY_INITIALIZED` | `runtime.identity.initialized` | Runtime ID assigned |
| `RUNTIME_STALE_CONTEXT_INVALIDATED` | `runtime.stale.context.invalidated` | Old context evicted |
| `RUNTIME_CAPABILITY_SNAPSHOT_UPDATED` | `runtime.capability.snapshot.updated` | Tool/skill/plugin snapshot refreshed |

### 4.6 Advanced Recovery & Checkpoint Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `RUNTIME_RECOVERY_STARTED` | `runtime.recovery.started` | Recovery procedure initiated |
| `RUNTIME_RECOVERY_COMPLETED` | `runtime.recovery.completed` | Recovery procedure complete |
| `SESSION_RECOVERY_STARTED` | `session.recovery.started` | Session recovery initiated |
| `SESSION_RECOVERY_COMPLETED` | `session.recovery.completed` | Session recovery complete |
| `RUNTIME_RECOVERY_THRESHOLD_EXCEEDED` | `runtime.recovery.threshold.exceeded` | Too many recovery attempts |
| `RUNTIME_CHECKPOINT_ROLLBACK_STARTED` | `runtime.checkpoint.rollback.started` | Checkpoint rollback initiated |
| `RUNTIME_CHECKPOINT_ROLLBACK_COMPLETED` | `runtime.checkpoint.rollback.completed` | Rollback complete |
| `RUNTIME_RECOVERY_CHECKPOINT_CREATED` | `runtime.recovery.checkpoint.created` | Recovery checkpoint saved |
| `RUNTIME_RECOVERY_CHECKPOINT_RESTORED` | `runtime.recovery.checkpoint.restored` | Recovery checkpoint restored |

### 4.7 Mount Lease Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `RUNTIME_MOUNT_LEASE_ACQUIRED` | `runtime.mount.lease.acquired` | 10-min mount lease granted |
| `RUNTIME_MOUNT_LEASE_EXPIRED` | `runtime.mount.lease.expired` | Mount lease expired |
| `RUNTIME_MOUNT_INTENT_CHANGED` | `runtime.mount.intent.changed` | Mount intent updated |
| `RUNTIME_MOUNT_INVARIANT_VIOLATED` | `runtime.mount.invariant.violated` | Invariant check failed |
| `SESSION_MOUNT_TIMEOUT` | `session.mount.timeout` | Mount operation timed out |

### 4.8 Session Validation Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `SESSION_VALIDATION_STARTED` | `session.validation.started` | Validation begins |
| `SESSION_VALIDATION_COMPLETED` | `session.validation.completed` | Validation complete |
| `SESSION_VALIDATION_CACHE_HIT` | `session.validation.cache.hit` | Cached validation result used |
| `SESSION_VALIDATION_CACHE_MISS` | `session.validation.cache.miss` | Cache miss, full validation run |
| `SESSION_COMPATIBILITY_FAILED` | `session.compatibility.failed` | Schema mismatch detected |

### 4.9 Session Quality Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `SESSION_ENTROPY_CHANGED` | `session.entropy.changed` | Content entropy metrics changed |
| `SESSION_SEMANTIC_DRIFT_CHANGED` | `session.semantic.drift.changed` | Semantic drift detected |
| `SESSION_COGNITIVE_LOAD_CHANGED` | `session.cognitive.load.changed` | Cognitive load metric changed |
| `SESSION_SEMANTIC_FINGERPRINT_UPDATED` | `session.semantic.fingerprint.updated` | Fingerprint recalculated |
| `SESSION_QUARANTINE_REASON_UPDATED` | `session.quarantine.reason.updated` | Quarantine reason logged |
| `SESSION_CORRUPTION_SCORE_CHANGED` | `session.corruption.score.changed` | Corruption score changed |
| `SESSION_RESTORE_MODE_CHANGED` | `session.restore.mode.changed` | Restore strategy changed |

### 4.10 Provider & Capability Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `PROVIDER_INITIALIZED` | `provider_initialized` | Provider ready |
| `PROVIDER_FAILED` | `provider_failed` | Provider initialization failed |
| — | `capability_autoload_started` | Capability load beginning |
| — | `capability_added` | Capability registered |
| — | `capability_removed` | Capability unregistered |
| — | `capability_updated` | Capability hot-swapped |
| — | `capability_failed` | Capability operation failed |
| — | `capability_initialized` | Capability fully ready |

### 4.11 Plugin & Skill Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `PLUGIN_LOADED` | `plugin_loaded` | Plugin initialized |
| `PLUGIN_FAILED` | `plugin_failed` | Plugin load failure |
| `SKILL_EXECUTED` | `skill_executed` | Skill completed |
| `SKILL_FAILED` | `skill_failed` | Skill execution failed |

### 4.12 Command Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `COMMAND_EXECUTED` | `command_executed` | CLI command completed |
| `COMMAND_FAILED` | `command_failed` | CLI command failed |

### 4.13 Package Manager Events

| Constant | Event String | Trigger |
|----------|-------------|---------|
| `PACKAGE_INSTALLING` | `package.installing` | Package install in progress |
| `PACKAGE_INSTALLED` | `package.installed` | Package successfully installed |
| `PACKAGE_REMOVED` | `package.removed` | Package uninstalled |
| `PACKAGE_UPDATED` | `package.updated` | Package version updated |
| `PACKAGE_VERIFIED` | `package.verified` | Package signature verified |
| `PACKAGE_TRANSACTION_STARTED` | `package.transaction.started` | Atomic install transaction begins |
| `PACKAGE_TRANSACTION_COMMITTED` | `package.transaction.committed` | Transaction committed |
| `PACKAGE_TRANSACTION_ROLLED_BACK` | `package.transaction.rolled_back` | Transaction rolled back |
| `PACKAGE_REPOSITORY_UPDATED` | `package.repository.updated` | Package repo refreshed |

---

## 5. Chat Execution Event Flow (SSE-facing)

These events are forwarded directly as SSE events to connected clients via `ApiServer.ts`:

```
User sends message
       │
       ▼ emit
execution_started   → SSE: event: execution_started
message_received    → SSE: event: message_received
thinking_started    → SSE: event: thinking_started
[per token]
response_chunk      → SSE: event: response_chunk { chunk }
thinking_finished   → SSE: event: thinking_finished
[per tool use]
tool_started        → SSE: event: tool_started { toolName, input }
tool_finished       → SSE: event: tool_finished { toolName, output }

execution_completed → SSE: event: execution_completed → SSE stream closes
runtime_error       → SSE: event: runtime_error { error } → SSE stream closes
```

---

## 6. Engine Registry Change Event

The `EngineManager` subscribes to:

```
RuntimeRegistryUpdated
```

When received, it triggers a full `reload()` of all engines — enabling live plugin addition without restart.

---

## 7. Event Bus Design Principles

1. **Singleton pattern**: One global `eventBus` instance shared across all modules via import.
2. **Typed event names**: All event strings come from the `EventTypes` constant map — no magic strings in business logic.
3. **No payload validation at bus level**: Payload structure is contract-enforced via `EventPayloads.ts` types and `EventRegistry.ts` metadata.
4. **Cleanup on SSE disconnect**: The `ApiServer.ts` chat handler unsubscribes all listeners when the client closes the connection.
5. **Memory event bus**: `MemoryEventBus` in the memory package is a separate scoped bus — prevents event cross-contamination between domains.
