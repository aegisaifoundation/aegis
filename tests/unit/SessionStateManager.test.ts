import { test } from 'node:test';
import assert from 'node:assert';
import { sessionStateManager } from '../../aegis-core/src/runtime/SessionStateManager.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';

test('SessionStateManager - transactional updates and rollbacks', async () => {
  await cleanupTestEnvironment();
  const testSessionId = 'test-state-manager-session';
  try {
    await memoryGateway.createSession(testSessionId, ['test'], 'system');
  } catch {}

  const state = await runtimeStateManager.loadState();
  const originalActiveId = state.activeSessionId;
  state.activeSessionId = testSessionId;
  await runtimeStateManager.saveState(state);

  // 1. Test valid transactional update
  await sessionStateManager.updateSessionState(testSessionId, {
    currentObjective: 'Stabilize Aegis Core',
    activeTasks: ['Task A', 'Task B'],
    temporaryExecutionContext: {
      'user.name': 'Gokul'
    }
  });

  const updatedState = await sessionStateManager.loadSessionState(testSessionId);
  assert.strictEqual(updatedState.currentObjective, 'Stabilize Aegis Core');
  assert.deepStrictEqual(updatedState.activeTasks, ['Task A', 'Task B']);
  assert.strictEqual(updatedState.temporaryExecutionContext?.['user.name'], 'Gokul');

  // Verify projections are updated
  const workingMemory = await memoryGateway.getWorkingMemory(testSessionId);
  assert.ok(workingMemory.includes('## Current Objective'));
  assert.ok(workingMemory.includes('Stabilize Aegis Core'));
  assert.ok(workingMemory.includes('- Task A'));
  assert.ok(workingMemory.includes('**user.name**: Gokul'));

  // 2. Test failed update triggering rollback
  let throwErrorOccurred = false;
  try {
    // Attempting update that fails validation (e.g. activeTasks is null/invalid type)
    await sessionStateManager.updateSessionState(testSessionId, {
      activeTasks: null as any
    });
  } catch (err) {
    throwErrorOccurred = true;
  }

  assert.strictEqual(throwErrorOccurred, true);

  // Verify state rolls back to previous successful state
  const rolledBackState = await sessionStateManager.loadSessionState(testSessionId);
  assert.strictEqual(rolledBackState.currentObjective, 'Stabilize Aegis Core');
  assert.deepStrictEqual(rolledBackState.activeTasks, ['Task A', 'Task B']);

  // Cleanup
  state.activeSessionId = originalActiveId;
  await runtimeStateManager.saveState(state);
  await memoryGateway.deleteSession(testSessionId).catch(() => {});
});

test('SessionStateManager - session memory refinement on limit exceeded', async () => {
  const { providerManager } = await import('../../aegis-core/src/providers/index.js');
  await cleanupTestEnvironment();
  const testSessionId = 'test-refine-session';
  try {
    await memoryGateway.createSession(testSessionId, ['test'], 'system');
  } catch {}

  const state = await runtimeStateManager.loadState();
  const originalActiveId = state.activeSessionId;
  state.activeSessionId = testSessionId;
  await runtimeStateManager.saveState(state);

  // Initialize session state
  await sessionStateManager.initializeSessionState(testSessionId);

  // 1. Mock the LLM provider generate call to return consolidated facts
  const originalGenerate = providerManager.generate;
  providerManager.generate = async (prompt: string) => {
    if (prompt.includes('Consolidate and refine')) {
      return JSON.stringify(['Refined Fact A', 'Refined Fact B']);
    }
    return originalGenerate.call(providerManager, prompt);
  };

  try {
    // 2. Trigger update with facts that exceed word limit (> 1000 words)
    // We create a very large list of facts to easily exceed the limit.
    const longFact = 'word '.repeat(50); // 50 words
    const factsArray = Array.from({ length: 25 }, (_, idx) => `Fact ${idx}: ${longFact}`); // 25 * 50 = 1250 words
    
    await sessionStateManager.updateSessionState(testSessionId, {
      stableFacts: factsArray
    });

    // 3. Verify that refinement was triggered and facts were consolidated
    const finalState = await sessionStateManager.loadSessionState(testSessionId);
    assert.deepStrictEqual(finalState.stableFacts, ['Refined Fact A', 'Refined Fact B']);

    // Check projected session memory
    const sessionMemory = await memoryGateway.getSessionMemory(testSessionId);
    assert.ok(sessionMemory.includes('- Refined Fact A'));
    assert.ok(sessionMemory.includes('- Refined Fact B'));
    assert.ok(!sessionMemory.includes('Fact 0:'));
  } finally {
    // Restore providerManager
    providerManager.generate = originalGenerate;
    // Cleanup
    state.activeSessionId = originalActiveId;
    await runtimeStateManager.saveState(state);
    await memoryGateway.deleteSession(testSessionId).catch(() => {});
  }
});

