import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { runtimeHealthValidator } from '../../aegis-core/src/runtime/RuntimeHealthValidator.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { workspaceManager } from '../../aegis-core/src/runtime/WorkspaceManager.js';

test('RuntimeHealthValidator - full validation suite', async () => {
  const testSessionId = 'test-health-session';
  try {
    await memoryGateway.createSession(testSessionId, ['test'], 'system');
  } catch {}

  const state = await runtimeStateManager.loadState();
  const originalActiveId = state.activeSessionId;
  const originalMountLease = state.mountLease;
  
  // Set active session for health validator to check
  state.activeSessionId = testSessionId;
  state.mountLease = {
    sessionId: testSessionId,
    acquiredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour in future
  };
  await runtimeStateManager.saveState(state);

  // 1. Validate healthy state
  const healthRes = await runtimeHealthValidator.validateHealth();
  assert.strictEqual(healthRes.healthy, true, `Expected healthy runtime, but got errors: ${healthRes.errors.join('; ')}`);

  // 2. Validate interrupted transaction detection (create a leftover .tmp file)
  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const tmpFile = path.resolve(wsRoot, `memory/sessions/${testSessionId}/interrupted.tmp`);
  await fs.writeFile(tmpFile, 'temporary context content', 'utf8');

  const healthRes2 = await runtimeHealthValidator.validateHealth();
  assert.strictEqual(healthRes2.healthy, false);
  assert.ok(healthRes2.errors.some(err => err.includes('Interrupted write transaction detected')));

  // Cleanup .tmp file
  await fs.unlink(tmpFile).catch(() => {});

  // Cleanup and restore original active session
  state.activeSessionId = originalActiveId;
  state.mountLease = originalMountLease;
  await runtimeStateManager.saveState(state);
  await memoryGateway.deleteSession(testSessionId).catch(() => {});
});
