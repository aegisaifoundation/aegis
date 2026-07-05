import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { IMemoryGateway } from './interfaces/IMemoryGateway.js';
import { SessionMetadata, MemoryLifecycleState, MemoryEntity, SessionState } from './interfaces/MemoryTypes.js';
import { Message } from '../types/Message.js';
import { MemoryPermissions } from './contracts/MemoryPermissions.js';
import { MetadataContract } from './contracts/MetadataContract.js';
import { SessionContract } from './contracts/SessionContract.js';
import { WorkingMemoryContract } from './contracts/WorkingMemoryContract.js';
import { readMemoryFile, writeMemoryFile, safeJsonRead, safeJsonWrite, calculateChecksum } from './utils/MemoryFileHelpers.js';
import { memoryTransactionManager } from './transactions/MemoryTransactionManager.js';
import { MemoryObservability } from './utils/MemoryObservability.js';
import { memoryEventBus } from './eventbus/MemoryEventBus.js';
import { memoryWriteBuffer } from './MemoryWriteBuffer.js';

export class MemoryGateway implements IMemoryGateway {
  private static instance = new MemoryGateway();

  // ── In-memory caches ─────────────────────────────────────────────
  /** Cached session metadata, keyed by sessionId. */
  private metadataCache = new Map<string, SessionMetadata>();
  /** Buffered in-memory history per session, keyed by sessionId. */
  private historyCache = new Map<string, { messages: Message[]; memoryVersion: string }>();
  /** Tracks whether historyCache has unflushed writes. */
  private historyDirty = new Set<string>();
  /** lastAccessedAt flush debounce: tracks which sessions need the timestamp flushed. */
  private accessedSessions = new Set<string>();
  /** Whether the background flush timer is running. */
  private flushTimerRunning = false;

  public static getInstance(): MemoryGateway {
    return this.instance;
  }

  private getSessionDir(sessionId: string): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, `memory/sessions/${sessionId}`);
  }

  // ── Cache helpers ─────────────────────────────────────────────────

  /** Invalidate cached metadata for a session (e.g., after a write). */
  public invalidateMetadataCache(sessionId: string): void {
    this.metadataCache.delete(sessionId);
  }

  /** Flush pending lastAccessedAt updates to disk (called at turn boundary / shutdown). */
  public async flushAccessTimestamps(): Promise<void> {
    if (this.accessedSessions.size === 0) return;
    const sessions = Array.from(this.accessedSessions);
    this.accessedSessions.clear();

    await Promise.allSettled(sessions.map(async (sessionId) => {
      const cached = this.metadataCache.get(sessionId);
      if (cached) {
        const metadataPath = path.join(this.getSessionDir(sessionId), 'metadata.json');
        memoryWriteBuffer.markDirty(metadataPath, JSON.stringify(cached, null, 2));
      }
    }));
  }

  /** Flush buffered history for a specific session to disk. Called at turn boundary. */
  public async flushHistory(sessionId: string): Promise<void> {
    if (!this.historyDirty.has(sessionId)) return;
    const history = this.historyCache.get(sessionId);
    if (!history) return;

    const filePath = path.join(this.getSessionDir(sessionId), 'history.json');
    const content = JSON.stringify(history, null, 2);
    await writeMemoryFile(filePath, content);

    // Update checksum in metadata
    const cached = this.metadataCache.get(sessionId);
    if (cached) {
      cached.checksums.history = calculateChecksum(content);
      cached.updatedAt = new Date().toISOString();
      const metadataPath = path.join(this.getSessionDir(sessionId), 'metadata.json');
      memoryWriteBuffer.markDirty(metadataPath, JSON.stringify(cached, null, 2));
    }

    this.historyDirty.delete(sessionId);
  }

  /** Flush all dirty session histories + pending write buffer. */
  public async flushAll(): Promise<void> {
    const dirtyIds = Array.from(this.historyDirty);
    await Promise.allSettled(dirtyIds.map((id) => this.flushHistory(id)));
    await this.flushAccessTimestamps();
    await memoryWriteBuffer.flush();
  }

  /**
   * Initializes a session file hierarchy including raw history, working memory, and session memory.
   */
  public async createSession(sessionId: string, tags: string[] = [], actor: string = 'system'): Promise<SessionMetadata> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }

    const sessionDir = this.getSessionDir(sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');

    const meta: SessionMetadata = {
      sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      memoryVersion: '1.0.0',
      lifecycleState: MemoryLifecycleState.ACTIVE,
      checksums: {},
      confidence: {},
      tags,
      quotas: {
        maxSessions: 100,
        maxHistorySize: 10 * 1024 * 1024,
        maxWorkingMemorySize: 1500,
        maxSessionMemorySize: 1000,
        maxSnapshots: 10
      }
    };

    const validated = MetadataContract.validateMetadata(meta);
    await safeJsonWrite(metadataPath, validated);
    
    // Create initial template files
    const historyChecksum = await safeJsonWrite(path.join(sessionDir, 'history.json'), { messages: [], memoryVersion: '1.0.0' });
    const sessionChecksum = await writeMemoryFile(path.join(sessionDir, 'session-memory.md'), '## Goals\n\n## Preferences\n\n## Stable Facts\n');
    const workingChecksum = await writeMemoryFile(path.join(sessionDir, 'working-memory.md'), '## Current Tasks\n\n## Intermediate Conclusions\n\n## Temporary Execution Context\n');
    const taskChecksum = await writeMemoryFile(path.join(sessionDir, 'task.md'), '# Tasks\n\n# Active Tasks\n');
    
    // Initialize session-state.json
    const defaultState: SessionState = {
      sessionId,
      status: 'ACTIVE',
      currentObjective: '',
      activeTasks: [],
      lastUpdatedAt: new Date().toISOString(),
      checkpointVersion: 0,
      temporaryExecutionContext: {},
      preferences: {},
      stableFacts: []
    };
    await safeJsonWrite(path.join(sessionDir, 'session-state.json'), defaultState);

    // Update metadata with file checksums
    validated.checksums = {
      history: historyChecksum,
      sessionMemory: sessionChecksum,
      workingMemory: workingChecksum,
      task: taskChecksum
    };
    await safeJsonWrite(metadataPath, validated);

    // Seed in-memory history cache
    this.historyCache.set(sessionId, { messages: [], memoryVersion: '1.0.0' });
    this.metadataCache.set(sessionId, validated);

    await MemoryObservability.logAudit(actor, 'write', 'session', sessionId, { action: 'created' });

    return validated;
  }

  /**
   * Loads the session metadata. Checks permissions and updates last accessed (buffered).
   */
  public async loadSession(sessionId: string, actor: string = 'system'): Promise<SessionMetadata> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }

    // Return cached metadata if available — avoids disk read + write on every call
    const cached = this.metadataCache.get(sessionId);
    if (cached) {
      // Record access for buffered timestamp flush (no immediate disk write)
      cached.lastAccessedAt = new Date().toISOString();
      this.accessedSessions.add(sessionId);
      MemoryObservability.logAuditAsync(actor, 'read', 'session', sessionId, { action: 'loaded' });
      return cached;
    }

    const sessionDir = this.getSessionDir(sessionId);
    const metadataPath = path.join(sessionDir, 'metadata.json');

    if (!existsSync(metadataPath)) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }

    const rawMeta = await safeJsonRead(metadataPath, null);
    if (!rawMeta) {
      throw new Error(`Metadata file corrupted or empty for session ${sessionId}.`);
    }

    const meta = MetadataContract.validateMetadata(rawMeta);
    // Update lastAccessedAt in memory only — flush at turn boundary
    meta.lastAccessedAt = new Date().toISOString();
    this.metadataCache.set(sessionId, meta);
    this.accessedSessions.add(sessionId);

    MemoryObservability.logAuditAsync(actor, 'read', 'session', sessionId, { action: 'loaded' });

    return meta;
  }

  /**
   * Permanently deletes a session and its associated storage structures.
   */
  public async deleteSession(sessionId: string, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('delete', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot delete.`);
    }

    const sessionDir = this.getSessionDir(sessionId);
    if (existsSync(sessionDir)) {
      await fs.rm(sessionDir, { recursive: true, force: true });
    }

    // Clear all caches for this session
    this.metadataCache.delete(sessionId);
    this.historyCache.delete(sessionId);
    this.historyDirty.delete(sessionId);
    this.accessedSessions.delete(sessionId);

    await MemoryObservability.logAudit(actor, 'delete', 'session', sessionId, { action: 'deleted' });
  }

  /**
   * Reads the working memory Markdown file for a session.
   */
  public async getWorkingMemory(sessionId: string, actor: string = 'system'): Promise<string> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const filePath = path.join(this.getSessionDir(sessionId), 'working-memory.md');
    // Check write buffer first (avoids disk read when content was just written)
    const buffered = memoryWriteBuffer.getPending(filePath);
    const content = buffered !== null ? buffered : await readMemoryFile(filePath);
    MemoryObservability.logAuditAsync(actor, 'read', 'workingMemory', sessionId);
    return content;
  }

  /**
   * Atomically overwrites working memory after validation.
   */
  public async updateWorkingMemory(sessionId: string, content: string, txId?: string, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }
    WorkingMemoryContract.validateContent(content);

    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'working-memory.md');
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    if (txId) {
      await memoryTransactionManager.registerWrite(txId, filePath, content);
      
      const meta = await this.loadSession(sessionId, actor);
      meta.checksums.workingMemory = calculateChecksum(content);
      meta.updatedAt = new Date().toISOString();
      await memoryTransactionManager.registerWrite(txId, metadataPath, JSON.stringify(meta, null, 2));

      MemoryObservability.logAuditAsync(actor, 'write', 'workingMemory', sessionId, { txId });
    } else {
      const localTxId = `tx_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        
        const meta = await this.loadSession(sessionId, actor);
        meta.checksums.workingMemory = calculateChecksum(content);
        meta.updatedAt = new Date().toISOString();
        this.metadataCache.set(sessionId, meta);
        await memoryTransactionManager.registerWrite(localTxId, metadataPath, JSON.stringify(meta, null, 2));

        await memoryTransactionManager.commitTransaction(localTxId);
        MemoryObservability.logAuditAsync(actor, 'write', 'workingMemory', sessionId);
        
        memoryEventBus.publish({
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          topic: 'workingMemory.updated',
          timestamp: new Date().toISOString(),
          sessionId,
          actor,
          payload: { content }
        });
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }

  /**
   * Reads session memory facts.
   */
  public async getSessionMemory(sessionId: string, actor: string = 'system'): Promise<string> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const filePath = path.join(this.getSessionDir(sessionId), 'session-memory.md');
    const buffered = memoryWriteBuffer.getPending(filePath);
    const content = buffered !== null ? buffered : await readMemoryFile(filePath);
    MemoryObservability.logAuditAsync(actor, 'read', 'sessionMemory', sessionId);
    return content;
  }

  /**
   * Atomically updates session memory after validation.
   */
  public async updateSessionMemory(sessionId: string, content: string, txId?: string, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }
    SessionContract.validateContent(content);

    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'session-memory.md');
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    if (txId) {
      await memoryTransactionManager.registerWrite(txId, filePath, content);
      
      const meta = await this.loadSession(sessionId, actor);
      meta.checksums.sessionMemory = calculateChecksum(content);
      meta.updatedAt = new Date().toISOString();
      await memoryTransactionManager.registerWrite(txId, metadataPath, JSON.stringify(meta, null, 2));

      MemoryObservability.logAuditAsync(actor, 'write', 'sessionMemory', sessionId, { txId });
    } else {
      const localTxId = `tx_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        
        const meta = await this.loadSession(sessionId, actor);
        meta.checksums.sessionMemory = calculateChecksum(content);
        meta.updatedAt = new Date().toISOString();
        this.metadataCache.set(sessionId, meta);
        await memoryTransactionManager.registerWrite(localTxId, metadataPath, JSON.stringify(meta, null, 2));

        await memoryTransactionManager.commitTransaction(localTxId);
        MemoryObservability.logAuditAsync(actor, 'write', 'sessionMemory', sessionId);
        
        memoryEventBus.publish({
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          topic: 'sessionMemory.updated',
          timestamp: new Date().toISOString(),
          sessionId,
          actor,
          payload: { content }
        });
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }

  /**
   * Appends interaction logs to history — buffered in-memory, flushed at turn boundary.
   */
  public async appendHistory(sessionId: string, message: Message, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }

    // Ensure history is loaded into cache
    if (!this.historyCache.has(sessionId)) {
      const filePath = path.join(this.getSessionDir(sessionId), 'history.json');
      const history = await safeJsonRead<{ messages: Message[]; memoryVersion: string }>(filePath, { messages: [], memoryVersion: '1.0.0' });
      this.historyCache.set(sessionId, history);
    }

    // Mutate in-memory cache only — no disk I/O on every message
    const history = this.historyCache.get(sessionId)!;
    history.messages.push(message);
    this.historyDirty.add(sessionId);

    MemoryObservability.logAuditAsync(actor, 'write', 'history', sessionId, { messageId: message.id });
    
    memoryEventBus.publish({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      topic: 'history.appended',
      timestamp: new Date().toISOString(),
      sessionId,
      actor,
      payload: { message }
    });
  }

  /**
   * Reads raw history — returns in-memory cache when available.
   */
  public async getHistory(sessionId: string, actor: string = 'system'): Promise<Message[]> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }

    if (this.historyCache.has(sessionId)) {
      MemoryObservability.logAuditAsync(actor, 'read', 'history', sessionId);
      return this.historyCache.get(sessionId)!.messages;
    }

    const filePath = path.join(this.getSessionDir(sessionId), 'history.json');
    const history = await safeJsonRead<{ messages: Message[]; memoryVersion: string }>(filePath, { messages: [], memoryVersion: '1.0.0' });
    this.historyCache.set(sessionId, history);
    MemoryObservability.logAuditAsync(actor, 'read', 'history', sessionId);
    return history.messages;
  }

  /**
   * Reads dynamic cognitive entities stored in entities.json.
   */
  public async getEntities(sessionId: string, actor: string = 'system'): Promise<MemoryEntity[]> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const filePath = path.join(this.getSessionDir(sessionId), 'entities.json');
    const entities = await safeJsonRead<MemoryEntity[]>(filePath, []);
    MemoryObservability.logAuditAsync(actor, 'read', 'entities', sessionId);
    return entities;
  }

  /**
   * Adds or updates a Cognitive Entity inside entities.json.
   */
  public async updateEntity(sessionId: string, entity: MemoryEntity, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }
    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'entities.json');
    const entities = await safeJsonRead<MemoryEntity[]>(filePath, []);
    
    const index = entities.findIndex(e => e.id === entity.id);
    if (index >= 0) {
      entities[index] = entity;
    } else {
      entities.push(entity);
    }

    const txId = `tx_${sessionId}_${Date.now()}`;
    memoryTransactionManager.beginTransaction(txId);
    try {
      await memoryTransactionManager.registerWrite(txId, filePath, JSON.stringify(entities, null, 2));
      await memoryTransactionManager.commitTransaction(txId);
      MemoryObservability.logAuditAsync(actor, 'write', 'entities', sessionId, { entityId: entity.id });
      
      memoryEventBus.publish({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        topic: 'entity.updated',
        timestamp: new Date().toISOString(),
        sessionId,
        actor,
        payload: { entity }
      });
    } catch (err) {
      await memoryTransactionManager.rollbackTransaction(txId);
      throw err;
    }
  }

  /**
   * Reads session-state.json from disk and parses it.
   */
  public async getSessionState(sessionId: string, actor: string = 'system'): Promise<SessionState> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'session-state.json');
    // Check write buffer first
    const buffered = memoryWriteBuffer.getPending(filePath);
    if (buffered !== null) {
      const state = JSON.parse(buffered) as SessionState;
      MemoryObservability.logAuditAsync(actor, 'read', 'sessionState', sessionId);
      return state;
    }
    if (!existsSync(filePath)) {
      throw new Error(`session-state.json not found for session ${sessionId}`);
    }
    const state = await safeJsonRead<SessionState | null>(filePath, null);
    if (!state) {
      throw new Error(`session-state.json corrupted or empty for session ${sessionId}`);
    }
    MemoryObservability.logAuditAsync(actor, 'read', 'sessionState', sessionId);
    return state;
  }

  /**
   * Writes session-state.json — uses write buffer for non-critical path, direct write inside transactions.
   */
  public async updateSessionState(sessionId: string, state: SessionState, txId?: string, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }
    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'session-state.json');
    const content = JSON.stringify(state, null, 2);

    if (txId) {
      await memoryTransactionManager.registerWrite(txId, filePath, content);
      MemoryObservability.logAuditAsync(actor, 'write', 'sessionState', sessionId, { txId });
    } else {
      const localTxId = `tx_state_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        await memoryTransactionManager.commitTransaction(localTxId);
        MemoryObservability.logAuditAsync(actor, 'write', 'sessionState', sessionId, { localTxId });
        
        memoryEventBus.publish({
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          topic: 'sessionState.updated',
          timestamp: new Date().toISOString(),
          sessionId,
          actor,
          payload: { state }
        });
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }

  /**
   * Reads the task Markdown file for a session.
   */
  public async getTask(sessionId: string, actor: string = 'system'): Promise<string> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const filePath = path.join(this.getSessionDir(sessionId), 'task.md');
    const buffered = memoryWriteBuffer.getPending(filePath);
    const content = buffered !== null ? buffered : await readMemoryFile(filePath);
    MemoryObservability.logAuditAsync(actor, 'read', 'taskMemory', sessionId);
    return content;
  }

  /**
   * Atomically overwrites task memory.
   */
  public async updateTask(sessionId: string, content: string, txId?: string, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }

    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'task.md');
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    if (txId) {
      await memoryTransactionManager.registerWrite(txId, filePath, content);
      
      const meta = await this.loadSession(sessionId, actor);
      meta.checksums.task = calculateChecksum(content);
      meta.updatedAt = new Date().toISOString();
      await memoryTransactionManager.registerWrite(txId, metadataPath, JSON.stringify(meta, null, 2));

      MemoryObservability.logAuditAsync(actor, 'write', 'taskMemory', sessionId, { txId });
    } else {
      const localTxId = `tx_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        
        const meta = await this.loadSession(sessionId, actor);
        meta.checksums.task = calculateChecksum(content);
        meta.updatedAt = new Date().toISOString();
        this.metadataCache.set(sessionId, meta);
        await memoryTransactionManager.registerWrite(localTxId, metadataPath, JSON.stringify(meta, null, 2));

        await memoryTransactionManager.commitTransaction(localTxId);
        MemoryObservability.logAuditAsync(actor, 'write', 'taskMemory', sessionId);
        
        memoryEventBus.publish({
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          topic: 'taskMemory.updated',
          timestamp: new Date().toISOString(),
          sessionId,
          actor,
          payload: { content }
        });
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }
}


export const memoryGateway = MemoryGateway.getInstance();
