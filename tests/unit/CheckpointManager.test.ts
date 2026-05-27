import { test } from 'node:test';
import assert from 'node:assert';
import { checkpointManager } from '../../aegis-core/src/runtime/CheckpointManager.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { workspaceManager } from '../../aegis-core/src/runtime/WorkspaceManager.js';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';
import fs from 'fs/promises';
import path from 'path';

test('CheckpointManager - create and restore checkpoints', async () => {
  await cleanupTestEnvironment();
  const testSessionId = 'test-checkpoint-session';
  const cpName = 'test-cp-run';
  
  const runtimeState = await runtimeStateManager.loadState();
  const originalActiveId = runtimeState.activeSessionId;

  try {
    try {
      await memoryGateway.createSession(testSessionId, ['test'], 'system');
    } catch (err) {}

    const initialRuntimeState = await runtimeStateManager.loadState();
    initialRuntimeState.activeSessionId = testSessionId;
    await runtimeStateManager.saveState(initialRuntimeState);

    const initialSessionState = await memoryGateway.getSessionState(testSessionId);
    initialSessionState.currentObjective = 'Initial Objective';
    await memoryGateway.updateSessionState(testSessionId, initialSessionState);

    // 2. Create checkpoint
    await checkpointManager.createCheckpoint(cpName, testSessionId);

    // 3. Mutate states
    initialRuntimeState.mountGeneration += 99;
    await runtimeStateManager.saveState(initialRuntimeState);

    initialSessionState.currentObjective = 'Mutated Objective';
    await memoryGateway.updateSessionState(testSessionId, initialSessionState);

    // 4. Restore checkpoint
    await checkpointManager.rollbackToCheckpoint(cpName, testSessionId);

    // 5. Assert states are restored
    const restoredRuntime = await runtimeStateManager.loadState();
    const restoredSession = await memoryGateway.getSessionState(testSessionId);

    assert.strictEqual(restoredSession.currentObjective, 'Initial Objective');
    assert.strictEqual(restoredRuntime.activeSessionId, testSessionId);
  } finally {
    // Restore active session ID
    const currentRuntimeState = await runtimeStateManager.loadState();
    currentRuntimeState.activeSessionId = originalActiveId;
    await runtimeStateManager.saveState(currentRuntimeState);

    // Cleanup session
    await memoryGateway.deleteSession(testSessionId).catch(() => {});

    // Cleanup checkpoint files
    const cpDir = path.resolve(path.dirname(workspaceManager.getWorkspacePath()), 'runtime/checkpoints');
    await fs.rm(path.join(cpDir, `${cpName}_runtime.json`), { force: true }).catch(() => {});
    await fs.rm(path.join(cpDir, `${cpName}_session_${testSessionId}.json`), { force: true }).catch(() => {});
  }
});
