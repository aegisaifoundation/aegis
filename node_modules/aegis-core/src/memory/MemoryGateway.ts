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

export class MemoryGateway implements IMemoryGateway {
  private static instance = new MemoryGateway();

  public static getInstance(): MemoryGateway {
    return this.instance;
  }

  private getSessionDir(sessionId: string): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, `memory/sessions/${sessionId}`);
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
      workingMemory: workingChecksum
    };
    await safeJsonWrite(metadataPath, validated);

    await MemoryObservability.logAudit(actor, 'write', 'session', sessionId, { action: 'created' });

    return validated;
  }

  /**
   * Loads the session metadata. Checks permissions and updates last accessed.
   */
  public async loadSession(sessionId: string, actor: string = 'system'): Promise<SessionMetadata> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
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
    meta.lastAccessedAt = new Date().toISOString();
    await safeJsonWrite(metadataPath, meta);

    await MemoryObservability.logAudit(actor, 'read', 'session', sessionId, { action: 'loaded' });

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
    const content = await readMemoryFile(filePath);
    await MemoryObservability.logAudit(actor, 'read', 'workingMemory', sessionId);
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

      await MemoryObservability.logAudit(actor, 'write', 'workingMemory', sessionId, { txId });
    } else {
      const localTxId = `tx_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        
        const meta = await this.loadSession(sessionId, actor);
        meta.checksums.workingMemory = calculateChecksum(content);
        meta.updatedAt = new Date().toISOString();
        await memoryTransactionManager.registerWrite(localTxId, metadataPath, JSON.stringify(meta, null, 2));

        await memoryTransactionManager.commitTransaction(localTxId);
        await MemoryObservability.logAudit(actor, 'write', 'workingMemory', sessionId);
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
    const content = await readMemoryFile(filePath);
    await MemoryObservability.logAudit(actor, 'read', 'sessionMemory', sessionId);
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

      await MemoryObservability.logAudit(actor, 'write', 'sessionMemory', sessionId, { txId });
    } else {
      const localTxId = `tx_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        
        const meta = await this.loadSession(sessionId, actor);
        meta.checksums.sessionMemory = calculateChecksum(content);
        meta.updatedAt = new Date().toISOString();
        await memoryTransactionManager.registerWrite(localTxId, metadataPath, JSON.stringify(meta, null, 2));

        await memoryTransactionManager.commitTransaction(localTxId);
        await MemoryObservability.logAudit(actor, 'write', 'sessionMemory', sessionId);
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }

  /**
   * Appends interaction logs to history.json under a transaction scope.
   */
  public async appendHistory(sessionId: string, message: Message, actor: string = 'system'): Promise<void> {
    if (!MemoryPermissions.check('write', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot write.`);
    }

    const sessionDir = this.getSessionDir(sessionId);
    const filePath = path.join(sessionDir, 'history.json');
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    const history = await safeJsonRead<{ messages: Message[]; memoryVersion: string }>(filePath, { messages: [], memoryVersion: '1.0.0' });
    history.messages.push(message);
    
    const txId = `tx_${sessionId}_${Date.now()}`;
    memoryTransactionManager.beginTransaction(txId);
    try {
      const content = JSON.stringify(history, null, 2);
      await memoryTransactionManager.registerWrite(txId, filePath, content);
      
      const meta = await this.loadSession(sessionId, actor);
      meta.checksums.history = calculateChecksum(content);
      meta.updatedAt = new Date().toISOString();
      await memoryTransactionManager.registerWrite(txId, metadataPath, JSON.stringify(meta, null, 2));

      await memoryTransactionManager.commitTransaction(txId);
      await MemoryObservability.logAudit(actor, 'write', 'history', sessionId, { messageId: message.id });
    } catch (err) {
      await memoryTransactionManager.rollbackTransaction(txId);
      throw err;
    }
  }

  /**
   * Reads raw history.json logs.
   */
  public async getHistory(sessionId: string, actor: string = 'system'): Promise<Message[]> {
    if (!MemoryPermissions.check('read', actor)) {
      throw new Error(`Permission denied: Actor ${actor} cannot read.`);
    }
    const filePath = path.join(this.getSessionDir(sessionId), 'history.json');
    const history = await safeJsonRead<{ messages: Message[]; memoryVersion: string }>(filePath, { messages: [], memoryVersion: '1.0.0' });
    await MemoryObservability.logAudit(actor, 'read', 'history', sessionId);
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
    await MemoryObservability.logAudit(actor, 'read', 'entities', sessionId);
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
      await MemoryObservability.logAudit(actor, 'write', 'entities', sessionId, { entityId: entity.id });
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
    if (!existsSync(filePath)) {
      throw new Error(`session-state.json not found for session ${sessionId}`);
    }
    const state = await safeJsonRead<SessionState | null>(filePath, null);
    if (!state) {
      throw new Error(`session-state.json corrupted or empty for session ${sessionId}`);
    }
    await MemoryObservability.logAudit(actor, 'read', 'sessionState', sessionId);
    return state;
  }

  /**
   * Writes session-state.json to disk atomically. Registers write if inside a transaction.
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
      await MemoryObservability.logAudit(actor, 'write', 'sessionState', sessionId, { txId });
    } else {
      const localTxId = `tx_state_${sessionId}_${Date.now()}`;
      memoryTransactionManager.beginTransaction(localTxId);
      try {
        await memoryTransactionManager.registerWrite(localTxId, filePath, content);
        await memoryTransactionManager.commitTransaction(localTxId);
        await MemoryObservability.logAudit(actor, 'write', 'sessionState', sessionId, { localTxId });
      } catch (err) {
        await memoryTransactionManager.rollbackTransaction(localTxId);
        throw err;
      }
    }
  }
}

export const memoryGateway = MemoryGateway.getInstance();
