import { test } from 'node:test';
import assert from 'node:assert';
import { runtimeSessionManager } from '../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { sessionStateManager } from '../../aegis-core/src/runtime/SessionStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { runtimeHealthValidator } from '../../aegis-core/src/runtime/RuntimeHealthValidator.js';
import { checkpointManager } from '../../aegis-core/src/runtime/CheckpointManager.js';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';
import fs from 'fs/promises';
import path from 'path';
import { workspaceManager } from '../../aegis-core/src/runtime/WorkspaceManager.js';

test('Stress - Switching Flood', async () => {
  await cleanupTestEnvironment();

  const session1 = 'stress-session-1';
  const session2 = 'stress-session-2';
  const runtimeState = await runtimeStateManager.loadState();
  const originalActiveId = runtimeState.activeSessionId;

  try {
    // 1. Create sessions
    try {
      await memoryGateway.createSession(session1, ['stress'], 'system');
      await memoryGateway.createSession(session2, ['stress'], 'system');
    } catch {}

    await sessionStateManager.initializeSessionState(session1);
    await sessionStateManager.initializeSessionState(session2);

    await sessionStateManager.updateSessionState(session1, { currentObjective: 'Objective 1' });
    await sessionStateManager.updateSessionState(session2, { currentObjective: 'Objective 2' });

    // 2. Perform rapid switching loop
    const switchCount = 16;
    for (let i = 0; i < switchCount; i++) {
      const target = i % 2 === 0 ? session1 : session2;
      await runtimeSessionManager.checkoutSession(target);
    }

    // 3. Verify consistency
    const state = await runtimeStateManager.loadState();
    assert.strictEqual(state.activeSessionId, session2);
    assert.strictEqual(state.mountedSessionId, session2);

    const health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, true, `Degraded health: ${health.errors.join('; ')}`);
  } finally {
    // Restore active session ID
    const currentRuntimeState = await runtimeStateManager.loadState();
    currentRuntimeState.activeSessionId = originalActiveId;
    currentRuntimeState.mountedSessionId = originalActiveId;
    await runtimeStateManager.saveState(currentRuntimeState);

    await runtimeSessionManager.shutdown().catch(() => {});
    await memoryGateway.deleteSession(session1).catch(() => {});
    await memoryGateway.deleteSession(session2).catch(() => {});
  }
});

test('Stress - Corrupted State Restoration', async () => {
  await cleanupTestEnvironment();

  const sessionCorrupt = 'stress-corrupt-session';
  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const stateFilePath = path.join(wsRoot, `memory/sessions/${sessionCorrupt}/session-state.json`);
  const cpDir = path.join(wsRoot, 'runtime/checkpoints');
  
  const runtimeState = await runtimeStateManager.loadState();
  const originalActive = runtimeState.activeSessionId;

  try {
    // 1. Setup session and write valid state
    try {
      await memoryGateway.createSession(sessionCorrupt, ['stress'], 'system');
    } catch {}
    await sessionStateManager.initializeSessionState(sessionCorrupt);
    
    // Save checkpoint
    await checkpointManager.createCheckpoint('pre-mutation-checkpoint', sessionCorrupt);

    // 2. Manually corrupt the file with invalid JSON
    await fs.writeFile(stateFilePath, '{ invalid json structure ', 'utf8');

    // Verify it fails health checks
    // Temporarily set active session to sessionCorrupt to trigger checks on it
    const activeRuntimeState = await runtimeStateManager.loadState();
    activeRuntimeState.activeSessionId = sessionCorrupt;
    await runtimeStateManager.saveState(activeRuntimeState);

    const health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, false);
    assert.ok(health.errors.some(e => e.includes('session-state.json read error') || e.includes('corrupted')));

    // 3. Trigger recovery pipeline
    await runtimeSessionManager.recoverRuntime();

    // Verify it is restored and healthy again
    const finalHealth = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(finalHealth.healthy, true);

    const recoveredSession = await memoryGateway.getSessionState(sessionCorrupt);
    assert.strictEqual(recoveredSession.sessionId, sessionCorrupt);
  } finally {
    // Restore original active session
    const currentRuntimeState = await runtimeStateManager.loadState();
    currentRuntimeState.activeSessionId = originalActive;
    currentRuntimeState.mountedSessionId = originalActive;
    await runtimeStateManager.saveState(currentRuntimeState);

    await runtimeSessionManager.shutdown().catch(() => {});
    await memoryGateway.deleteSession(sessionCorrupt).catch(() => {});

    // Delete checkpoint files
    await fs.rm(path.join(cpDir, `pre-mutation-checkpoint_runtime.json`), { force: true }).catch(() => {});
    await fs.rm(path.join(cpDir, `pre-mutation-checkpoint_session_${sessionCorrupt}.json`), { force: true }).catch(() => {});
  }
});
