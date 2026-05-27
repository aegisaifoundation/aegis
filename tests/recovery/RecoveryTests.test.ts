import { test } from 'node:test';
import assert from 'node:assert';
import { runtimeSessionManager } from '../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { sessionStateManager } from '../../aegis-core/src/runtime/SessionStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { runtimeHealthValidator } from '../../aegis-core/src/runtime/RuntimeHealthValidator.js';
import { checkpointManager } from '../../aegis-core/src/runtime/CheckpointManager.js';
import { BootMode } from '../../aegis-core/src/memory/interfaces/MemoryTypes.js';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';
import fs from 'fs/promises';
import path from 'path';
import { workspaceManager } from '../../aegis-core/src/runtime/WorkspaceManager.js';

test('Recovery - Unclean Shutdown (Process Kill) Simulation', async () => {
  await cleanupTestEnvironment();

  const sessionRecovery = 'recovery-kill-session';
  const runtimeState = await runtimeStateManager.loadState();
  const originalActiveId = runtimeState.activeSessionId;

  try {
    // 1. Create a session and set it as active
    try {
      await memoryGateway.createSession(sessionRecovery, ['recovery'], 'system');
    } catch {}
    await sessionStateManager.initializeSessionState(sessionRecovery);

    const activeState = await runtimeStateManager.loadState();
    activeState.activeSessionId = sessionRecovery;
    activeState.mountedSessionId = sessionRecovery;
    activeState.lastShutdownClean = false; // Simulate unclean shutdown
    await runtimeStateManager.saveState(activeState);

    // 2. Initialize runtime session manager to trigger recovery logic
    await runtimeSessionManager.initialize();

    // 3. Verify it booted in recovery/clean state
    const postInitState = await runtimeStateManager.loadState();
    assert.strictEqual(postInitState.activeSessionId, sessionRecovery);
    assert.strictEqual(postInitState.lastShutdownClean, false); // Stays false until clean shutdown

    const health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, true, `Expected healthy runtime, but got errors: ${health.errors.join('; ')}`);
  } finally {
    // Restore active session ID
    const currentRuntimeState = await runtimeStateManager.loadState();
    currentRuntimeState.activeSessionId = originalActiveId;
    currentRuntimeState.mountedSessionId = originalActiveId;
    currentRuntimeState.lastShutdownClean = true;
    await runtimeStateManager.saveState(currentRuntimeState);

    await runtimeSessionManager.shutdown().catch(() => {});
    await memoryGateway.deleteSession(sessionRecovery).catch(() => {});
  }
});

test('Recovery - Double Corruption Fallback', async () => {
  await cleanupTestEnvironment();

  const sessionDoubleCorrupt = 'recovery-double-corrupt';
  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const stateFilePath = path.join(wsRoot, `memory/sessions/${sessionDoubleCorrupt}/session-state.json`);
  const cpDir = path.join(wsRoot, 'runtime/checkpoints');
  const checkpointFilePath = path.join(cpDir, `pre-mutation-checkpoint_session_${sessionDoubleCorrupt}.json`);
  const runtimeCheckpointFilePath = path.join(cpDir, `pre-mutation-checkpoint_runtime.json`);

  const runtimeState = await runtimeStateManager.loadState();
  const originalActive = runtimeState.activeSessionId;

  try {
    // 1. Create session and initialize
    try {
      await memoryGateway.createSession(sessionDoubleCorrupt, ['recovery'], 'system');
    } catch {}
    await sessionStateManager.initializeSessionState(sessionDoubleCorrupt);

    // Create a checkpoint
    await checkpointManager.createCheckpoint('pre-mutation-checkpoint', sessionDoubleCorrupt);

    // 2. Corrupt BOTH the session state and the checkpoint file
    await fs.writeFile(stateFilePath, '{ corrupt session json }', 'utf8');
    await fs.writeFile(checkpointFilePath, '{ corrupt checkpoint json }', 'utf8');

    // Make active
    const activeRuntimeState = await runtimeStateManager.loadState();
    activeRuntimeState.activeSessionId = sessionDoubleCorrupt;
    await runtimeStateManager.saveState(activeRuntimeState);

    // Verify it is unhealthy
    let health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, false);

    // 3. Recover runtime (should fail checkpoint restore, fallback to fresh initialize)
    await runtimeSessionManager.recoverRuntime();

    // Verify it successfully booted to a fresh default state and is healthy
    health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, true);

    const sessionState = await memoryGateway.getSessionState(sessionDoubleCorrupt);
    assert.strictEqual(sessionState.sessionId, sessionDoubleCorrupt);
    assert.strictEqual(sessionState.currentObjective, ''); // Freshly initialized
  } finally {
    // Restore original active session
    const currentRuntimeState = await runtimeStateManager.loadState();
    currentRuntimeState.activeSessionId = originalActive;
    currentRuntimeState.mountedSessionId = originalActive;
    await runtimeStateManager.saveState(currentRuntimeState);

    await runtimeSessionManager.shutdown().catch(() => {});
    await memoryGateway.deleteSession(sessionDoubleCorrupt).catch(() => {});

    // Cleanup checkpoint files
    await fs.rm(checkpointFilePath, { force: true }).catch(() => {});
    await fs.rm(runtimeCheckpointFilePath, { force: true }).catch(() => {});
  }
});
