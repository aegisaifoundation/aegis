# AEGIS — Cognitive Memory Redesign
**Version:** 1.0.0 | **Last Updated:** 2026-07-12

> **Note:** This document replaces the previous cognitive memory blueprint. It documents the **implemented** memory architecture as it exists today.

---

## 1. Design Philosophy

The AEGIS Cognitive Memory System treats memory as a **durable, structured operating resource** — not a simple log file. Key design decisions:

1. **Session isolation**: Each session is completely isolated with its own files, state, and history.
2. **Write buffering**: High-frequency writes during streaming are coalesced via `MemoryWriteBuffer` to prevent I/O thrash.
3. **Projection-based injection**: Memory is not dumped into the prompt wholesale. It is projected into focused markdown summaries injected at the right granularity.
4. **Integrity first**: Every file has a checksum. Any mismatch triggers quarantine and recovery, never silent corruption.
5. **Lifecycle-driven**: Sessions have explicit lifecycle states, not just timestamps.
6. **Transaction support**: Multi-file operations use `MemoryTransactionManager` for atomicity.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    MemoryEngine (IEngine)                     │
│  Registers all memory services to ServiceRegistry on boot    │
└───────────────────────────┬──────────────────────────────────┘
                            │ registers
        ┌───────────────────┼────────────────────┐
        │                   │                    │
        ▼                   ▼                    ▼
  MemoryGateway      MemoryManager      ProjectionGenerator
  (primary I/O)    (orchestration)    (prompt injection)
        │                   │                    │
        ▼                   │                    ▼
  MemoryWriteBuffer          │          working-memory.md
  (coalesced writes)         │          session-memory.md
        │                   │
        ▼                   ▼
  Filesystem           MemoryTransactionManager
  memory/sessions/     (ACID-like atomicity)
```

---

## 3. Session Memory Model

Each session directory contains exactly 6 files:

```
memory/sessions/session_<timestamp>/
├── metadata.json        ← Session lifecycle, timestamps, checksums, quotas
├── history.json         ← Full conversation (role, content, id, timestamp)
├── session-state.json   ← Objectives, tasks, stable facts, preferences
├── session-memory.md    ← Long-term semantic context (goals, facts, prefs)
├── working-memory.md    ← Short-term per-turn context (tools, objectives)
└── task.md              ← Active task checklist
```

### 3.1 Memory File Roles

| File | Updated When | Used For |
|------|-------------|----------|
| `metadata.json` | Every operation | Session identification, integrity, quota enforcement |
| `history.json` | Every message sent/received | Conversation history, agent context window |
| `session-state.json` | Post-turn (after agent response) | Goal tracking, task management |
| `session-memory.md` | Post-turn (when facts extracted) | Long-term persistent agent context |
| `working-memory.md` | Pre-turn (before agent thinks) | Immediate context for current interaction |
| `task.md` | When tasks are assigned/completed | Task list for complex multi-step work |

---

## 4. Projection System

### 4.1 What is a Projection?

A projection is a **focused, formatted subset of memory** injected into the agent's system prompt. It is NOT the full raw file — it is a curated view.

### 4.2 Working Memory Projection

Generated from `working-memory.md` just before each agent turn:

```markdown
# WORKING MEMORY PROJECTION
- goal: Analyze patient CBC results
- current objective: Extract key abnormal values

available tools:
- PatientDataTool
- MemoryTool
- FileTool

available skills:
- extract
- summarize
```

### 4.3 Session Memory Projection

Generated from `session-memory.md`:

```markdown
# SESSION MEMORY PROJECTION

## Goals
- Complete CBC analysis and recommend follow-up

## Preferences
- User prefers concise summaries

## Stable Facts
- Patient: Male, 45y, diabetic
- Last HbA1c: 8.2% (elevated)
```

### 4.4 GGUF Provider Projection Cleanup

When using the local GGUF provider, memory projections are aggressively cleaned:

```
Raw projection           After cleanup
─────────────────────   ──────────────────────────────────
- goal: None             (removed entirely)
- current objective: None  (removed entirely)
available tools:         (removed — GGUF model ignores tools)
- None

Session memory →         ### Patient Lab Data:
                         <extracted lab values>

                         ### Medical Context:
                         <relevant session facts>
```

This ensures small local models receive only the relevant clinical context without noise.

---

## 5. Write Buffer Design

### 5.1 Problem

During streaming responses (token-by-token), the agent may call `appendHistory()` many times in rapid succession. Without buffering, this causes excessive filesystem writes.

### 5.2 Solution: MemoryWriteBuffer

```
Message arrives →
appendHistory(sessionId, message) →
  historyCache.get(sessionId).messages.push(message)   ← in-memory only
  historyDirty.add(sessionId)                          ← mark dirty

... more messages ...

Turn ends → flushHistory(sessionId) →
  writeMemoryFile(history.json, JSON.stringify(messages)) ← single write
  MemoryWriteBuffer.markDirty(metadata.json, checksum)

5 seconds later → MemoryWriteBuffer.flush() →
  fs.writeFile(metadata.json)                           ← metadata write
```

**Result:** N messages in a turn = 1 history.json write + 1 metadata.json write (debounced).

### 5.3 Auto-flush

```typescript
getMemoryWriteBuffer().startAutoFlush(5000);  // every 5 seconds
```

The write buffer flushes all dirty files every 5 seconds, or immediately at:
- Turn boundary (explicit `flushHistory()` call)
- Session checkout (before unmounting)
- System shutdown

---

## 6. Integrity System

### 6.1 Checksum Scheme

Every memory file has a SHA-256 checksum stored in `metadata.json.checksums`:

```json
{
  "checksums": {
    "history": "c9e80f2d...",
    "workingMemory": "80e5caaf...",
    "sessionMemory": "38a08563...",
    "task": "0e15818f..."
  }
}
```

### 6.2 Validation Flow

```
loadSession(sessionId) or getHistory(sessionId)
    │
    ├─ Read file from disk
    ├─ calculateChecksum(content)
    ├─ Compare to metadata.json.checksums[file]
    │
    ├─ Match → proceed normally
    │
    └─ Mismatch →
         emit: memory.corrupted
         SessionRecoveryManager.recover(sessionId)
             ├─ Copy to memory/quarantine/<sessionId>/
             ├─ Attempt restoration from last snapshot
             └─ If no snapshot → create clean session
```

---

## 7. Transaction System

### 7.1 Use Case

When multiple memory files must be updated atomically (e.g., history + state + metadata), use `MemoryTransactionManager`:

```typescript
const txId = await memoryTransactionManager.begin(sessionId);

try {
  await memoryGateway.appendHistory(sessionId, userMessage);
  await memoryGateway.updateSessionState(sessionId, newState);
  await memoryGateway.writeMemoryFile(sessionId, 'session-memory.md', projection);
  await memoryTransactionManager.commit(txId);
} catch (err) {
  await memoryTransactionManager.rollback(txId);
  // All changes rolled back — filesystem state restored
}
```

### 7.2 Rollback Mechanism

Before any write, the transaction manager saves a snapshot of the current file state. On rollback, files are restored to their pre-transaction contents.

---

## 8. Session Lifecycle

### 8.1 State Machine

```
                 createNewSession()
                        │
                   ┌────▼────┐
                   │ CREATING │
                   └────┬────┘
                        │ (dir created, files written)
                   ┌────▼────┐
            ┌──────►  ACTIVE  ◄──────── checkoutSession()
            │      └────┬────┘
            │           │
   resumeSession()  deleteSession()
            │           │
            │      ┌────▼────┐
            └──────│  TRASH  │
                   └─────────┘

   Corruption detected:
   ACTIVE → QUARANTINED → (recovery) → ACTIVE
                        → (unrecoverable) → new session
```

### 8.2 Mount Lease

When a session is mounted (checked out), a **10-minute lease** is written to the runtime state:

```json
{
  "mountLease": {
    "ownerRuntimeId": "node-123",
    "acquiredAt": "2026-07-12T17:00:00Z",
    "expiresAt": "2026-07-12T17:10:00Z"
  }
}
```

On boot, an expired lease is auto-renewed, preventing stale state from blocking startup.

---

## 9. Session Quotas

| Quota | Default | Enforcement |
|-------|---------|-------------|
| `maxSessions` | 100 | Block create if exceeded |
| `maxHistorySize` | 10,485,760 bytes (10 MB) | Warn + prune old messages |
| `maxWorkingMemorySize` | 1,500 chars | Truncate projection |
| `maxSessionMemorySize` | 1,000 chars | Truncate projection |
| `maxSnapshots` | 10 | Delete oldest snapshot on create |

---

## 10. Memory Event Flow

```
Turn Start:
  ProjectionGenerator.generate(sessionId)
    → read working-memory.md
    → read session-state.json
    → read tool/skill registries
    → compose working-memory projection
    → compose session-memory projection
    → return { workingMemory, sessionMemory }

During Turn (streaming):
  appendHistory(sessionId, { role: 'user', content: '...' })
  appendHistory(sessionId, { role: 'assistant', content: '...' })
    → in-memory only, dirty flag set

Turn End:
  SessionStateManager.updateFromTurn(sessionId, executedActions, response)
    → update objectives, tasks, stable facts
    → write session-state.json
  flushHistory(sessionId)
    → write history.json to disk
    → update checksums in metadata.json
  MemoryWriteBuffer auto-flush (5s)
    → write metadata.json to disk
```

---

## 11. Service Registration Map

On `MemoryEngine.initialize()`, these services are registered:

| ServiceRegistry Token | Class | Description |
|----------------------|-------|-------------|
| `memoryGateway` | `MemoryGateway` | Primary memory I/O |
| `memoryManager` | `MemoryManager` | High-level orchestration |
| `MemoryIndexManager` | `MemoryIndexManager` | Search indexing |
| `memoryTransactionManager` | `MemoryTransactionManager` | Transactions |
| `projectionGenerator` | `ProjectionGenerator` | Prompt injection |
| `memoryWriteBuffer` | `MemoryWriteBuffer` | Write coalescing |
| `MemoryObservability` | `MemoryObservability` | Metrics/observability |

These are accessed throughout the runtime via:
```typescript
const mg = serviceRegistry.get<MemoryGateway>('memoryGateway');
```
