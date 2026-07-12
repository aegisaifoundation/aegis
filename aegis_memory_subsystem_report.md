# AEGIS — Memory Subsystem Report
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

---

## 1. Overview

The AEGIS Memory Subsystem is a full-featured, filesystem-backed cognitive memory platform. It provides session-scoped persistent storage with ACID-like transactions, in-memory write buffering, semantic projections, and integrity validation. All memory is stored in structured directories under `memory/`.

---

## 2. Package Structure

```
packages/aegis-memory/src/
├── MemoryGateway.ts                  # Primary I/O interface — all memory reads/writes
├── MemoryManager.ts                  # High-level orchestration + projection lifecycle
├── MemoryEngine.ts                   # IEngine — registers all memory services to ServiceRegistry
├── MemoryWriteBuffer.ts              # Write coalescing with 5s auto-flush
├── ProjectionGenerator.ts           # Generates working-memory.md & session-memory.md
├── ProjectionConsistencyValidator.ts # Validates projection integrity & checksums
├── SessionMemory.ts                  # Session memory data model
├── Memory.ts                         # Core memory entity model
├── MemoryLoader.ts                   # Memory deserialization & loading
├── MemoryRegistry.ts                 # In-memory entity registry
├── MemoryContext.ts                  # Memory context container
├── index.ts                          # Public exports
│
├── contracts/
│   ├── MemoryPermissions.ts          # Access control rules
│   ├── MetadataContract.ts           # Metadata validation rules
│   ├── SessionContract.ts            # Session validity contract
│   └── WorkingMemoryContract.ts      # Working memory constraints
│
├── embedding/                        # Vector embedding subsystem
├── eventbus/
│   └── MemoryEventBus.ts             # Memory-scoped event bus
├── indexing/                         # Full-text & semantic search indexes
├── interfaces/
│   ├── IMemoryGateway.ts             # Gateway interface contract
│   └── MemoryTypes.ts                # Re-exports from @aegis/sdk
├── locking/                          # Distributed lock management
├── migration/                        # Schema migration tooling
├── recovery/                         # Corruption detection & recovery
├── refinement/                       # Memory compression & pruning
├── registry/                         # Memory object registry
├── scheduler/                        # Async background memory tasks
├── search/                           # Search query engine
├── transactions/
│   └── MemoryTransactionManager.ts   # ACID-like transaction support
└── utils/
    ├── MemoryFileHelpers.ts           # File read/write + checksums
    └── MemoryObservability.ts         # Metrics + observability hooks
```

---

## 3. Session Filesystem Layout

```
memory/
├── sessions/
│   ├── default/                       # Default session (always exists)
│   │   ├── metadata.json
│   │   ├── history.json
│   │   ├── session-state.json
│   │   ├── session-memory.md
│   │   ├── working-memory.md
│   │   └── task.md
│   │
│   └── session_<timestamp>/           # Named sessions
│       ├── metadata.json
│       ├── history.json
│       ├── session-state.json
│       ├── session-memory.md
│       ├── working-memory.md
│       └── task.md
│
├── trash/                             # Soft-deleted sessions
│   └── session_<timestamp>/           # Full session dir preserved
│
├── quarantine/                        # Corrupted sessions pending recovery
│   └── session_<timestamp>/
│
├── snapshots/                         # Point-in-time session snapshots
│   └── session_<timestamp>_snap_<ts>/
│
├── episodic/                          # Cross-session episodic memory
├── indexes/                           # Search index files
├── persistence/                       # Persistence layer files
└── profile/                           # User profile memory
```

---

## 4. Data Models

### 4.1 Session Metadata (`metadata.json`)

```json
{
  "sessionId": "session_1783876795565",
  "createdAt": "2026-07-12T17:19:55.594Z",
  "updatedAt": "2026-07-12T17:20:42.498Z",
  "lastAccessedAt": "2026-07-12T17:23:40.500Z",
  "memoryVersion": "1.0.0",
  "lifecycleState": "ACTIVE",
  "checksums": {
    "history": "<sha256>",
    "workingMemory": "<sha256>",
    "sessionMemory": "<sha256>",
    "task": "<sha256>"
  },
  "confidence": {},
  "tags": [],
  "quotas": {
    "maxSessions": 100,
    "maxHistorySize": 10485760,
    "maxWorkingMemorySize": 1500,
    "maxSessionMemorySize": 1000,
    "maxSnapshots": 10
  },
  "lastMountedAt": "2026-07-12T17:23:40.500Z"
}
```

### 4.2 Session State (`session-state.json`)

```json
{
  "sessionId": "session_1783876795565",
  "status": "ACTIVE",
  "currentObjective": "",
  "activeTasks": [],
  "lastUpdatedAt": "2026-07-12T17:20:42.490Z",
  "checkpointVersion": 1,
  "temporaryExecutionContext": {},
  "preferences": {},
  "stableFacts": [],
  "implementedDetails": ""
}
```

### 4.3 History (`history.json`)

```json
{
  "messages": [
    {
      "id": "<uuid>",
      "role": "user",
      "content": "User message text",
      "metadata": {},
      "createdAt": "2026-07-12T17:20:00.000Z"
    },
    {
      "id": "<uuid>",
      "role": "assistant",
      "content": "Agent response text",
      "metadata": {},
      "createdAt": "2026-07-12T17:20:05.000Z"
    }
  ],
  "memoryVersion": "1.0.0"
}
```

### 4.4 Working Memory (`working-memory.md`)

```markdown
- goal: None
- current objective: None

available tools:
- FileTool
- MemoryTool

available skills:
- summarize
- extract
```

### 4.5 Session Memory (`session-memory.md`)

Long-form contextual memory generated by `ProjectionGenerator`:
```markdown
## Goals
- None

## Preferences
- None

## Stable Facts
- None
```

---

## 5. MemoryGateway — Core API

```typescript
class MemoryGateway implements IMemoryGateway {
  // Session lifecycle
  createSession(sessionId, metadata): Promise<void>
  loadSession(sessionId, caller): Promise<SessionMetadata>
  deleteSession(sessionId): Promise<void>

  // State management
  getSessionState(sessionId, caller): Promise<SessionState>
  updateSessionState(sessionId, state): Promise<void>

  // History
  getHistory(sessionId, caller): Promise<Message[]>
  appendHistory(sessionId, message): Promise<void>
  flushHistory(sessionId): Promise<void>

  // File I/O
  readMemoryFile(sessionId, filename): Promise<string>
  writeMemoryFile(sessionId, filename, content): Promise<void>

  // Cache management
  invalidateMetadataCache(sessionId): void
  flushAccessTimestamps(): Promise<void>
}
```

---

## 6. Write Buffer (MemoryWriteBuffer)

All file writes are coalesced through the write buffer to prevent I/O storms during streaming responses:

```
appendHistory(sessionId, message)
    │
    ▼ in-memory
historyCache.get(sessionId).messages.push(message)
historyDirty.add(sessionId)
    │
    ▼ on turn boundary / explicit flush
flushHistory(sessionId)
    │
    ▼ writeMemoryFile() → disk
    │
    ▼ markDirty(metadata.json) → MemoryWriteBuffer
    │
    ▼ 5s debounce timer
MemoryWriteBuffer.flush() → fs.writeFile(metadata.json)
```

**Auto-flush interval:** 5,000ms (5 seconds)

---

## 7. Projection System

The `ProjectionGenerator` creates markdown projections of session state for injection into agent prompts:

### 7.1 Working Memory Projection

Generated every turn before agent thinks. Includes:
- Current goal and objective
- Available tools (from ToolRegistry)
- Available skills (from SkillRegistry)
- Active tasks and recent context

Injected into agent system prompt as:
```
# WORKING MEMORY PROJECTION
<content>
```

### 7.2 Session Memory Projection

Generated from `session-memory.md`. Includes:
- Long-term goals
- User preferences
- Stable facts
- Implemented details

Injected into agent system prompt as:
```
# SESSION MEMORY PROJECTION
<content>
```

### 7.3 GGUF Provider Cleanup

The `GGUFProvider` applies specialized cleanup to working/session memory projections before sending to the small local model:
- Removes tool/skill listings (not needed for GGUF)
- Removes empty goal/objective fields
- Formats as concise medical context

---

## 8. Transaction System

`MemoryTransactionManager` provides rollback capability for memory operations:

```typescript
const txId = await transactionManager.begin(sessionId);
try {
  await memoryGateway.appendHistory(sessionId, message);
  await memoryGateway.updateSessionState(sessionId, state);
  await transactionManager.commit(txId);
} catch (err) {
  await transactionManager.rollback(txId);  // restore previous state
}
```

---

## 9. Integrity & Checksums

Every session file has a corresponding SHA-256 checksum stored in `metadata.json`:

| File | Checksum Field |
|------|---------------|
| `history.json` | `checksums.history` |
| `working-memory.md` | `checksums.workingMemory` |
| `session-memory.md` | `checksums.sessionMemory` |
| `task.md` | `checksums.task` |

On every read, checksums are validated. Mismatch → `memory.corrupted` event → `SESSION_QUARANTINED` → recovery attempt.

---

## 10. Session Lifecycle Events

| Event | Trigger |
|-------|---------|
| `session.created` | New session created |
| `session.loaded` | Session metadata loaded |
| `session.mounted` | Session fully mounted (history + state in cache) |
| `session.unmounted` | Previous session flushed and evicted |
| `session.deleted` | Session moved to trash |
| `session.restored` | Session recovered from trash |
| `session.renamed` | displayName updated |
| `session.forked` | Session snapshot + new checkout |
| `memory.corrupted` | Checksum mismatch detected |
| `memory.restored` | Corruption recovered |
| `memory.snapshot.created` | Snapshot written |
| `memory.refined` | Memory compressed/pruned |
| `memory.updated` | Memory entity written |
| `working-memory.expired` | Working memory TTL exceeded |

---

## 11. Memory Quotas

| Quota | Default | Enforcement |
|-------|---------|-------------|
| `maxSessions` | 100 | Prevents unbounded session creation |
| `maxHistorySize` | 10 MB | Limits history.json file size |
| `maxWorkingMemorySize` | 1,500 chars | Working memory projection size cap |
| `maxSessionMemorySize` | 1,000 chars | Session memory projection size cap |
| `maxSnapshots` | 10 | Per-session snapshot limit |

---

## 12. Recovery System

When corruption is detected:

```
memory.corrupted event emitted
    │
    ▼
SessionRecoveryManager.recover(sessionId)
    ├─ Copy corrupted session to memory/quarantine/
    ├─ Attempt checksum re-validation
    ├─ If recoverable: restore from last good snapshot
    │   └─ emit: memory.restored
    └─ If unrecoverable: create new session
        └─ emit: session.created
```

---

## 13. MemoryEngine Registration

On `MemoryEngine.initialize()`, the following services are registered in `ServiceRegistry`:

| Token | Service |
|-------|---------|
| `memoryGateway` | MemoryGateway singleton |
| `memoryManager` | MemoryManager singleton |
| `MemoryIndexManager` | MemoryIndexManager |
| `memoryTransactionManager` | MemoryTransactionManager |
| `projectionGenerator` | ProjectionGenerator |
| `memoryWriteBuffer` | MemoryWriteBuffer |
| `MemoryObservability` | MemoryObservability |

Then `RuntimeSessionManager.initialize()` is called to:
1. Create required directories (`runtime/`, `runtime/checkpoints/`, `memory/trash/`, `memory/quarantine/`)
2. Start write buffer auto-flush (5s)
3. Run startup health validation
4. Mount the active session
