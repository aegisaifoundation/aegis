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
