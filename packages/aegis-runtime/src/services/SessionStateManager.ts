import { serviceRegistry } from '../registry/ServiceRegistry.js';
const getMemoryGateway = () => serviceRegistry.get<any>('memoryGateway');
const getProjectionGenerator = () => serviceRegistry.get<any>('projectionGenerator');
const getProjectionConsistencyValidator = () => serviceRegistry.get<any>('projectionConsistencyValidator');
const getMemoryTransactionManager = () => serviceRegistry.get<any>('memoryTransactionManager');
const getProviderManager = () => serviceRegistry.get<any>('providerManager');
import { SessionState } from '@aegis/sdk';



import { checkpointManager } from './CheckpointManager.js';

import { eventBus } from '../eventbus/EventBus.js';
import { logger } from '../logging/StructuredLogger.js';


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
      stableFacts: [],
      implementationPlan: '',
      implementedDetails: ''
    };
    this.validateSessionState(defaultState);
    await getMemoryGateway().updateSessionState(sessionId, defaultState, undefined, actor);
    logger.log('info', 'SESSION_STATE_INITIALIZED', sessionId, { defaultState });
    return defaultState;
  }

  /**
   * Loads the authoritative session state.
   */
  public async loadSessionState(sessionId: string, actor: string = 'system'): Promise<SessionState> {
    const state = await getMemoryGateway().getSessionState(sessionId, actor);
    this.validateSessionState(state);
    return state;
  }

  /**
   * Directly saves session state (outside of the mutation pipeline).
   */
  public async saveSessionState(state: SessionState, txId?: string, actor: string = 'system'): Promise<void> {
    this.validateSessionState(state);
    await getMemoryGateway().updateSessionState(state.sessionId, state, txId, actor);
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
    if (state.implementationPlan !== undefined && typeof state.implementationPlan !== 'string') {
      throw new Error('Invalid SessionState: implementationPlan must be a string');
    }
    if (state.implementedDetails !== undefined && typeof state.implementedDetails !== 'string') {
      throw new Error('Invalid SessionState: implementedDetails must be a string');
    }
    if (state.goal !== undefined && typeof state.goal !== 'string') {
      throw new Error('Invalid SessionState: goal must be a string');
    }
    if (state.tasks !== undefined && !Array.isArray(state.tasks)) {
      throw new Error('Invalid SessionState: tasks must be an array of strings');
    }
  }

  /**
   * Performs an atomic state update using the full transaction pipeline:
   * Validation → Transaction Begin → Mutation → Projection → Consistency Check → Commit → Dispatch.
   *
   * OPTIMIZATION: Checkpoint is NOT created here on every mutation. It is the caller's
   * responsibility to create a turn-level checkpoint via checkpointSessionState() once
   * per user turn (in RuntimeExecutor.execute()) before any mutations begin.
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
    getMemoryTransactionManager().beginTransaction(txId);

    try {
      // 3. Refine memory if word limit is exceeded
      let sessionProj = getProjectionGenerator().generateSessionMemoryProjection(mutated);
      if (!getProjectionGenerator().validateProjectionSize(sessionProj, 1000)) {
        logger.log('info', 'SESSION_MEMORY_LIMIT_EXCEEDED', sessionId, {
          wordCount: sessionProj.trim().split(/\s+/).filter(Boolean).length
        });
        
        try {
          const refinedFacts = await this.refineStableFacts(mutated.stableFacts || [], actor);
          mutated.stableFacts = refinedFacts;
        } catch (err: any) {
          logger.log('error', 'SESSION_MEMORY_REFINEMENT_FAILED', sessionId, { error: err.message });
          throw new Error(`Failed to refine session memory: ${err.message}`);
        }
      }

      // 4. Mutation (register state write)
      await this.saveSessionState(mutated, txId, actor);

      // 5. Projection Regeneration — dirty-aware, parallel writes
      await getProjectionGenerator().projectSessionState(sessionId, mutated, txId, actor);

      // 6. Consistency Validation (pre-validate in memory before committing)
      const workingProj = getProjectionGenerator().generateWorkingMemoryProjection(mutated);
      const updatedSessionProj = getProjectionGenerator().generateSessionMemoryProjection(mutated);
      const updatedTaskProj = getProjectionGenerator().generateTaskProjection(mutated);

      const consistency = getProjectionConsistencyValidator().validateProjectionSynchronization(
        workingProj,
        updatedSessionProj,
        updatedTaskProj,
        mutated
      );
      if (!consistency.valid) {
        throw new Error(`Consistency validation failed during mutation pipeline: ${consistency.reason}`);
      }

      // 7. Commit
      await getMemoryTransactionManager().commitTransaction(txId);
      logger.log('info', 'SESSION_STATE_MUTATION_COMMITTED', sessionId, { updates });

      // 8. Event Dispatch
      eventBus.emit('session_state_updated', { sessionId, updates });
    } catch (err: any) {
      // 9. Rollback on failure
      logger.log('error', 'SESSION_STATE_MUTATION_FAILED', sessionId, { error: err.message, updates });
      
      try {
        await getMemoryTransactionManager().rollbackTransaction(txId);
        logger.log('warn', 'SESSION_STATE_ROLLBACK_COMPLETED', sessionId);
      } catch (rollbackErr: any) {
        logger.log('error', 'MUTATION_ROLLBACK_CRITICAL_ERROR', sessionId, { error: rollbackErr.message });
      }

      throw err;
    }
  }

  /**
   * Checkpoints both runtime and session states.
   * Should be called ONCE per user turn (at the start of RuntimeExecutor.execute()),
   * not inside updateSessionState.
   */
  public async checkpointSessionState(sessionId: string, name: string): Promise<void> {
    await checkpointManager.createCheckpoint(name, sessionId);
    logger.log('info', 'CHECKPOINT_CREATED', sessionId, { checkpointName: name });
  }

  /**
   * Restores both runtime and session states from checkpoint, then projects markdown files.
   */
  public async recoverSessionState(sessionId: string, name: string): Promise<void> {
    await checkpointManager.rollbackToCheckpoint(name, sessionId);
    logger.log('warn', 'RECOVERY_RESTORE_COMPLETED', sessionId, { checkpointName: name });
  }

  /**
   * Refines the list of stable facts using the LLM.
   */
  private async refineStableFacts(facts: string[], actor: string = 'system'): Promise<string[]> {
    if (facts.length === 0) return [];

    const prompt = `You are Aegis, a cognitive AI. The session memory word limit has been reached. Consolidate and refine the following list of stable facts into a crystal-clear, concise summary that fits within the budget while preserving all critical information.
Provide your output as a raw JSON string array, matching the format: ["fact 1", "fact 2", ...].
Current facts to refine:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;

    const response = await getProviderManager().generate(prompt);
    
    const trimmed = response.trim();
    
    const parseRefinedFacts = (text: string): string[] => {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) {}

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch (e) {}
      }

      const arrayMatch = text.match(/\[\s*("[\s\S]*?"\s*,\s*)*"[\s\S]*?"\s*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch (e) {}
      }

      return text.split('\n')
        .map(l => l.trim().replace(/^[-*+•]\s+/, '').replace(/^\d+\.\s+/, ''))
        .filter(l => l.length > 0);
    };

    return parseRefinedFacts(trimmed);
  }
}

export const sessionStateManager = SessionStateManager.getInstance();
