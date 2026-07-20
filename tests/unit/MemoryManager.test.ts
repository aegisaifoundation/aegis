import { test } from 'node:test';
import assert from 'node:assert';
import { memoryManager } from '../../packages/aegis-memory/src/MemoryManager.js';
import { memoryGateway } from '../../packages/aegis-memory/src/MemoryGateway.js';
import { serviceRegistry } from '../../packages/aegis-runtime/src/registry/ServiceRegistry.js';
import { eventBus } from '../../packages/aegis-runtime/src/eventbus/EventBus.js';
import { workspaceManager } from '../../packages/aegis-runtime/src/workspace/WorkspaceManager.js';
import { loadEnvironment } from '../../packages/aegis-runtime/src/utils/environment.js';
import { readMemoryFile } from '../../packages/aegis-memory/src/utils/MemoryFileHelpers.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { cleanupTestEnvironment } from '../helpers/cleanup.js';

// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);

test('MemoryManager - full lifecycle and validation suite', async () => {
  await cleanupTestEnvironment();

  // 1. Initialize
  await memoryManager.initialize();

  // 2. Create Session
  const sessionId = 'test-validation-session';
  // Clean up if exists
  await memoryManager.deleteSession(sessionId, 'system').catch(() => {});
  
  const meta = await memoryManager.createSession(sessionId, ['test', 'validation'], 'agent');
  assert.strictEqual(meta.sessionId, sessionId, "Session created with correct ID");
  assert.ok(meta.tags.includes('validation'), "Session contains correct tags");
  assert.strictEqual(meta.lifecycleState, 'ACTIVE', "Session is in ACTIVE state");

  // Check directory layout
  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
  assert.ok(existsSync(path.join(sessionDir, 'metadata.json')), "metadata.json exists");
  assert.ok(existsSync(path.join(sessionDir, 'history.json')), "history.json exists");
  assert.ok(existsSync(path.join(sessionDir, 'session-memory.md')), "session-memory.md exists");
  assert.ok(existsSync(path.join(sessionDir, 'working-memory.md')), "working-memory.md exists");

  // 3. Operations & History Append
  await memoryManager.appendHistory(sessionId, 'user', 'remember to always use dark mode preferred', {}, 'agent');
  const history = await memoryGateway.getHistory(sessionId, 'agent');
  assert.strictEqual(history.length, 1, "One history record appended");
  assert.strictEqual(history[0].content, 'remember to always use dark mode preferred', "History content matches");

  // 4. Working Memory Update
  const initialWorking = '## Current Tasks\n- [ ] Code completion\n- [x] Run compilation\n\n## Intermediate Conclusions\n- Compiling looks good\n';
  await memoryManager.updateWorkingMemory(sessionId, initialWorking, 'agent');
  const workingContent = await memoryManager.getWorkingMemory(sessionId, 'agent');
  assert.ok(workingContent.includes('Code completion'), "Working memory written successfully");

  // 5. Checksums & Verification
  const metaReload = await memoryManager.loadSession(sessionId, 'agent');
  assert.ok(metaReload.checksums.workingMemory !== undefined, "Checksum stored for working memory");

  // 6. Memory Refinement & Compaction
  await memoryManager.compress(sessionId, 'agent');
  
  const refinedWorking = await memoryManager.getWorkingMemory(sessionId, 'agent');
  const refinedSession = await memoryManager.getSessionMemory(sessionId, 'agent');
  
  // Pruning assertion (Task 2 was marked [x] so it should be pruned)
  assert.ok(!refinedWorking.includes('Run compilation'), "Completed task successfully pruned from working memory");
  assert.ok(refinedWorking.includes('Code completion'), "Active task retained in working memory");
  
  // Extraction assertion (User said "remember to always use dark mode preferred")
  assert.ok(refinedSession.includes('remember to always use dark mode preferred'), "Fact extracted and refined into session-memory.md");

  // 7. Snapshots
  const snapsDir = path.resolve(wsRoot, `memory/snapshots/${sessionId}`);
  assert.ok(existsSync(snapsDir), "Snapshots folder created for session");
  const snaps = await fs.readdir(snapsDir);
  assert.ok(snaps.length >= 2, "Created working and session memory snapshots before compression");

  // 8. Transactions & Rollback
  const { memoryTransactionManager } = await import('../../packages/aegis-memory/src/transactions/MemoryTransactionManager.js');
  const txId = 'test-tx-fail';
  memoryTransactionManager.beginTransaction(txId);
  
  const targetFile = path.join(sessionDir, 'working-memory.md');
  const preContent = await readMemoryFile(targetFile);
  
  await memoryTransactionManager.registerWrite(txId, targetFile, 'GARBAGE DATA');
  // Simulate failure and roll back
  await memoryTransactionManager.rollbackTransaction(txId);
  
  const postContent = await readMemoryFile(targetFile);
  assert.strictEqual(preContent, postContent, "Transaction rollback restored original content");

  // 9. Permissions checks
  let permThrew = false;
  try {
    // 'visitor' is not in the list of allowed writers
    await memoryManager.updateWorkingMemory(sessionId, 'Some content', 'visitor');
  } catch {
    permThrew = true;
  }
  assert.ok(permThrew, "Writer role restriction enforced successfully");

  // 10. Self-Repair and Recovery
  // Let's corrupt history.json and verify it gets recovered from the snapshots
  const historyPath = path.join(sessionDir, 'history.json');
  await fs.writeFile(historyPath, "{ CORRUPTED JSON ", 'utf8');
  
  const metaIntegrity = await memoryManager.loadSession(sessionId, 'agent');
  assert.ok(metaIntegrity !== null, "Corrupt session successfully recovered and loaded");
  
  const recoveredHistory = await memoryGateway.getHistory(sessionId, 'agent');
  assert.ok(recoveredHistory.length > 0, "History successfully restored from snapshot");

  // 11. Cleanup
  await memoryManager.deleteSession(sessionId, 'system');
  assert.ok(!existsSync(sessionDir), "Session data deleted cleanly");

  await memoryManager.shutdown();
});
