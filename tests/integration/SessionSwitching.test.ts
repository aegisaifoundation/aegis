import { test } from 'node:test';
import assert from 'node:assert';
import { runtimeSessionManager } from '../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { runtimeStateManager } from '../../aegis-core/src/runtime/RuntimeStateManager.js';
import { sessionStateManager } from '../../aegis-core/src/runtime/SessionStateManager.js';
import { memoryGateway } from '../../aegis-core/src/memory/MemoryGateway.js';
import { messageFormatter } from '../../aegis-core/src/agent/MessageFormatter.js';
import { runtimeHealthValidator } from '../../aegis-core/src/runtime/RuntimeHealthValidator.js';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';

test('Integration - Session Switching and Prompt Injection', async () => {
  await cleanupTestEnvironment();
  const sessionA = 'session-integration-a';
  const sessionB = 'session-integration-b';

  // Ensure active session is healthy/initialized first
  const initialState = await runtimeStateManager.loadState();
  if (initialState.activeSessionId) {
    await sessionStateManager.initializeSessionState(initialState.activeSessionId).catch(() => {});
  } else {
    initialState.activeSessionId = 'default';
    await runtimeStateManager.saveState(initialState);
    await sessionStateManager.initializeSessionState('default').catch(() => {});
  }

  try {
    // 1. Create sessions
    try {
      await memoryGateway.createSession(sessionA, ['tagA'], 'system');
      await memoryGateway.createSession(sessionB, ['tagB'], 'system');
    } catch {}

    // Initialize their session states
    await sessionStateManager.initializeSessionState(sessionA);
    await sessionStateManager.initializeSessionState(sessionB);

    // Set active objectives
    await sessionStateManager.updateSessionState(sessionA, {
      currentObjective: 'Objective A',
      activeTasks: ['Task A1']
    });
    await sessionStateManager.updateSessionState(sessionB, {
      currentObjective: 'Objective B',
      activeTasks: ['Task B1']
    });

    // 2. Checkout Session A
    await runtimeSessionManager.checkoutSession(sessionA);

    let state = await runtimeStateManager.loadState();
    assert.strictEqual(state.activeSessionId, sessionA);
    assert.strictEqual(state.mountedSessionId, sessionA);

    let health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, true, `Expected healthy after checkout sessionA, but got: ${health.errors.join('; ')}`);

    // Verify prompt injection order for Session A
    let formattedMessages = await messageFormatter.formatMessages([
      { id: '1', role: 'user', content: 'What is my current objective?', timestamp: new Date().toISOString() }
    ]);
    let systemMessage = formattedMessages[0];
    assert.strictEqual(systemMessage.role, 'system');
    assert.ok(systemMessage.content.includes('# SYSTEM RULES'));
    assert.ok(systemMessage.content.includes('# RUNTIME STATE'));
    assert.ok(systemMessage.content.includes('Active Session: session-integration-a'));
    assert.ok(systemMessage.content.includes('# WORKING MEMORY PROJECTION'));
    assert.ok(systemMessage.content.includes('Objective A'));
    assert.ok(systemMessage.content.includes('Task A1'));

    // 3. Checkout Session B
    await runtimeSessionManager.checkoutSession(sessionB);

    state = await runtimeStateManager.loadState();
    assert.strictEqual(state.activeSessionId, sessionB);
    assert.strictEqual(state.mountedSessionId, sessionB);

    health = await runtimeHealthValidator.validateHealth();
    assert.strictEqual(health.healthy, true, `Expected healthy after checkout sessionB, but got: ${health.errors.join('; ')}`);

    // Verify prompt injection order for Session B
    formattedMessages = await messageFormatter.formatMessages([
      { id: '2', role: 'user', content: 'What is my current objective?', timestamp: new Date().toISOString() }
    ]);
    systemMessage = formattedMessages[0];
    assert.ok(systemMessage.content.includes('Active Session: session-integration-b'));
    assert.ok(systemMessage.content.includes('Objective B'));
    assert.ok(systemMessage.content.includes('Task B1'));

  } finally {
    // Shutdown watchdog/heartbeat timers to let the process exit cleanly
    await runtimeSessionManager.shutdown().catch(() => {});
    
    // Cleanup sessions
    await memoryGateway.deleteSession(sessionA).catch(() => {});
    await memoryGateway.deleteSession(sessionB).catch(() => {});
  }
});
