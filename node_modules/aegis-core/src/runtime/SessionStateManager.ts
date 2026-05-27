import { SessionState } from '../memory/interfaces/MemoryTypes.js';
import { memoryGateway } from '../memory/MemoryGateway.js';
import { projectionGenerator } from '../memory/ProjectionGenerator.js';
import { projectionConsistencyValidator } from '../memory/ProjectionConsistencyValidator.js';
import { checkpointManager } from './CheckpointManager.js';
import { memoryTransactionManager } from '../memory/transactions/MemoryTransactionManager.js';
import { eventBus } from './EventBus.js';
import { logger } from '../utils/StructuredLogger.js';

export class SessionStateManager {
  private static instance = new SessionStateManager();

  public static getInstance(): SessionStateManager {
    return this.instance;
  }

  /**
   * Initializes authoritative session-state.json inside a session.
   */
  public async initializeSessionState(sessionId: string, actor: string = 'system'): Promise<SessionState> {
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
    this.validateSessionState(defaultState);
    await memoryGateway.updateSessionState(sessionId, defaultState, undefined, actor);
    await logger.info('SESSION_STATE_INITIALIZED', sessionId, { defaultState });
    return defaultState;
  }

  /**
   * Loads the authoritative session state.
   */
  public async loadSessionState(sessionId: string, actor: string = 'system'): Promise<SessionState> {
    const state = await memoryGateway.getSessionState(sessionId, actor);
    this.validateSessionState(state);
    return state;
  }

  /**
   * Directly saves session state (outside of the mutation pipeline).
   */
  public async saveSessionState(state: SessionState, txId?: string, actor: string = 'system'): Promise<void> {
    this.validateSessionState(state);
    await memoryGateway.updateSessionState(state.sessionId, state, txId, actor);
  }

  /**
   * Validates structural integrity of the SessionState object.
   */
  public validateSessionState(state: SessionState): void {
    if (!state.sessionId) {
      throw new Error('Invalid SessionState: sessionId is required');
    }
    if (!state.status) {
      throw new Error('Invalid SessionState: status is required');
    }
    if (typeof state.currentObjective !== 'string') {
      throw new Error('Invalid SessionState: currentObjective must be a string');
    }
    if (!Array.isArray(state.activeTasks)) {
      throw new Error('Invalid SessionState: activeTasks must be an array of strings');
    }
  }

  /**
   * Performs an atomic state update using the full transaction pipeline:
   * Validation -> Transaction Begin -> Checkpoint -> Mutation -> Projection -> Consistency Check -> Commit -> Dispatch.
   * Rollback on ANY failure.
   */
  public async updateSessionState(sessionId: string, updates: Partial<SessionState>, actor: string = 'system'): Promise<void> {
    const current = await this.loadSessionState(sessionId, actor);
    
    // 1. Validation of updates
    const mutated: SessionState = {
      ...current,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
      checkpointVersion: (current.checkpointVersion || 0) + 1
    };
    this.validateSessionState(mutated);

    // 2. Transaction Begin
    const txId = `tx_mutate_${sessionId}_${Date.now()}`;
    memoryTransactionManager.beginTransaction(txId);

    try {
      // 3. Checkpoint Creation
      await checkpointManager.createCheckpoint('pre-mutation-checkpoint', sessionId);
      await logger.info('MUTATION_CHECKPOINT_CREATED', sessionId, { checkpoint: 'pre-mutation-checkpoint' });

      // 4. Mutation (register state write)
      await this.saveSessionState(mutated, txId, actor);

      // 5. Projection Regeneration (register markdown writes under same transaction)
      await projectionGenerator.projectSessionState(sessionId, mutated, txId, actor);

      // 6. Consistency Validation (pre-validate in memory before committing)
      const workingProj = projectionGenerator.generateWorkingMemoryProjection(mutated);
      const sessionProj = projectionGenerator.generateSessionMemoryProjection(mutated);

      const consistency = projectionConsistencyValidator.validateProjectionSynchronization(
        workingProj,
        sessionProj,
        mutated
      );
      if (!consistency.valid) {
        throw new Error(`Consistency validation failed during mutation pipeline: ${consistency.reason}`);
      }

      // 7. Commit
      await memoryTransactionManager.commitTransaction(txId);
      await logger.info('SESSION_STATE_MUTATION_COMMITTED', sessionId, { updates });

      // 8. Event Dispatch
      eventBus.emit('session_state_updated', { sessionId, updates });
    } catch (err: any) {
      // 9. Rollback on failure
      await logger.error('SESSION_STATE_MUTATION_FAILED', sessionId, { error: err.message, updates });
      
      try {
        await memoryTransactionManager.rollbackTransaction(txId);
        await checkpointManager.rollbackToCheckpoint('pre-mutation-checkpoint', sessionId);
        await logger.warn('SESSION_STATE_ROLLBACK_COMPLETED', sessionId);
      } catch (rollbackErr: any) {
        await logger.error('MUTATION_ROLLBACK_CRITICAL_ERROR', sessionId, { error: rollbackErr.message });
      }

      throw err;
    }
  }

  /**
   * Checkpoints both runtime and session states.
   */
  public async checkpointSessionState(sessionId: string, name: string): Promise<void> {
    await checkpointManager.createCheckpoint(name, sessionId);
    await logger.info('CHECKPOINT_CREATED', sessionId, { checkpointName: name });
  }

  /**
   * Restores both runtime and session states from checkpoint, then projects markdown files.
   */
  public async recoverSessionState(sessionId: string, name: string): Promise<void> {
    await checkpointManager.rollbackToCheckpoint(name, sessionId);
    await logger.warn('RECOVERY_RESTORE_COMPLETED', sessionId, { checkpointName: name });
  }
}

export const sessionStateManager = SessionStateManager.getInstance();
