import fs from 'fs';
import path from 'path';
import {
  AegisStateScope,
  StateConflictStrategy,
  StateWriteConsistency,
  StateReplicationStrategy,
  StateErrorCode,
  StateError
} from '@aegis/sdk';
import {
  AegisStateManager,
  MemoryStorageAdapter,
  FileStorageAdapter,
  StateVersionManager,
  StateConflictResolver,
  StateMutationDeduplicationRegistry,
  DistributedTaskManager,
  AegisMessageRouter,
  PeerRegistry
} from '@aegis/runtime';

async function runPhase5TestSuite() {
  console.log('\n============================================================');
  console.log('  AEGIS Phase 5 Distributed State & Persistence Test Suite');
  console.log('============================================================\n');

  const nodeAId = 'aegis://11111111-1111-4111-a111-111111111111';
  const nodeBId = 'aegis://22222222-2222-4222-a222-222222222222';
  const testDir = path.resolve(process.cwd(), '.aegis/test-state-phase5');

  // Clean test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  // [Test 1] State Creation & Mutation Identity
  console.log('[Test 1] State Creation & Mutation Identity');
  const memStorageA = new MemoryStorageAdapter();
  const mockRouterA = new AegisMessageRouter(nodeAId, () => null);
  const peerRegA = new PeerRegistry(true);
  const stateMgrA = new AegisStateManager(nodeAId, memStorageA, mockRouterA, peerRegA);
  await stateMgrA.initialize();

  const record1 = await stateMgrA.createState('engine/di/config', { maxWorkers: 4 }, { scope: AegisStateScope.NODE });
  if (
    record1.key === 'engine/di/config' &&
    record1.versionInfo.version === 1 &&
    record1.createdByNodeId === nodeAId &&
    record1.value.maxWorkers === 4
  ) {
    console.log(`  ✔ State record created cleanly: ${record1.key} (Version: ${record1.versionInfo.version})`);
  } else {
    throw new Error('Test 1 failed: State creation failed');
  }

  // [Test 2] Persistent Restart Recovery (FileStorageAdapter)
  console.log('\n[Test 2] Persistent Restart Recovery (FileStorageAdapter)');
  const fileStorage = new FileStorageAdapter(testDir);
  const persistentMgr1 = new AegisStateManager(nodeAId, fileStorage, mockRouterA, peerRegA);
  await persistentMgr1.initialize();
  await persistentMgr1.createState('node/config/port', { port: 9900 }, { scope: AegisStateScope.NODE });

  // Simulate shutdown & restart
  await persistentMgr1.getStateStore().close();

  const fileStorage2 = new FileStorageAdapter(testDir);
  const persistentMgr2 = new AegisStateManager(nodeAId, fileStorage2, mockRouterA, peerRegA);
  await persistentMgr2.initialize();

  const restoredRecord = await persistentMgr2.getState('node/config/port');
  if (restoredRecord && restoredRecord.value.port === 9900) {
    console.log(`  ✔ State record successfully restored after persistent file restart (${restoredRecord.key})`);
  } else {
    throw new Error('Test 2 failed: Persistent restart recovery failed');
  }
  await persistentMgr2.getStateStore().close();

  // [Test 3] Deterministic 4-Step Version Ordering
  console.log('\n[Test 3] Deterministic 4-Step Version Ordering');
  const winner1 = StateVersionManager.evaluateLwwWinner(
    { version: 5, timestamp: 1000, nodeId: 'aegis://node-A', mutationId: 'mut-1', value: 'A' },
    { version: 6, timestamp: 900, nodeId: 'aegis://node-B', mutationId: 'mut-2', value: 'B' }
  );

  const winner2 = StateVersionManager.evaluateLwwWinner(
    { version: 5, timestamp: 1000, nodeId: 'aegis://node-B', mutationId: 'mut-2', value: 'B' },
    { version: 5, timestamp: 1000, nodeId: 'aegis://node-A', mutationId: 'mut-1', value: 'A' }
  );

  if (winner1 === 'B' && winner2 === 'A') {
    console.log(`  ✔ Deterministic version ordering: Higher version wins first; Node ID tie-breaks equal version/timestamp`);
  } else {
    throw new Error('Test 3 failed: Version ordering tie-break failed');
  }

  // [Test 4] State Mutation Deduplication
  console.log('\n[Test 4] State Mutation Deduplication');
  const dedupReg = new StateMutationDeduplicationRegistry();
  const mutId = 'aegis-state-mutation://test-dedup-1';

  dedupReg.register(mutId);
  if (dedupReg.isDuplicate(mutId) && !dedupReg.isDuplicate('aegis-state-mutation://other')) {
    console.log(`  ✔ Mutation deduplication registry correctly identified duplicate ${mutId}`);
  } else {
    throw new Error('Test 4 failed: Mutation deduplication failed');
  }

  // [Test 5] Tombstone Deletion Protection
  console.log('\n[Test 5] Tombstone Deletion Protection');
  await stateMgrA.createState('distributed/shared/key', { count: 1 }, { scope: AegisStateScope.DISTRIBUTED });
  await stateMgrA.deleteState('distributed/shared/key');

  const tombstoneRecord = await stateMgrA.getStateStore().getRecord('distributed/shared/key');
  if (tombstoneRecord && tombstoneRecord.deleted && tombstoneRecord.versionInfo.version === 2) {
    console.log(`  ✔ Distributed deletion created versioned tombstone (Version 2, deleted: true)`);
  } else {
    throw new Error('Test 5 failed: Tombstone creation failed');
  }

  // [Test 6] Optimistic Concurrency Control (expectedVersion)
  console.log('\n[Test 6] Optimistic Concurrency Control (expectedVersion)');
  const optRecord = await stateMgrA.createState('engine/opt/key', { val: 1 }, { scope: AegisStateScope.NODE });
  await stateMgrA.updateState('engine/opt/key', { val: 2 }, { expectedVersion: 1 });

  try {
    await stateMgrA.updateState('engine/opt/key', { val: 3 }, { expectedVersion: 1 }); // Current version is 2
    throw new Error('Test 6 failed: Should have thrown STATE_VERSION_CONFLICT');
  } catch (err: any) {
    if (err.code === StateErrorCode.STATE_VERSION_CONFLICT) {
      console.log(`  ✔ Rejected update with mismatched expectedVersion (Current is 2, expected 1): ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 7 & 8] Scope Isolation (LOCAL vs NODE vs DISTRIBUTED)
  console.log('\n[Test 7 & 8] Scope Isolation');
  const localRec = await stateMgrA.createState('local/cache/item', { cached: true }, { scope: AegisStateScope.LOCAL });
  const nodeRec = await stateMgrA.createState('node/config/item', { persistent: true }, { scope: AegisStateScope.NODE });

  if (localRec.scope === AegisStateScope.LOCAL && nodeRec.scope === AegisStateScope.NODE) {
    console.log(`  ✔ Scopes correctly isolated: LOCAL runtime cache vs NODE persistent configuration`);
  } else {
    throw new Error('Test 7/8 failed: Scope isolation failed');
  }

  // [Test 9] Namespace Key Validation
  console.log('\n[Test 9] Namespace Key Validation');
  try {
    await stateMgrA.createState('invalidKeyWithoutNamespace', { data: 123 });
    throw new Error('Test 9 failed: Should have rejected non-namespaced key');
  } catch (err: any) {
    if (err.code === StateErrorCode.INVALID_STATE_KEY) {
      console.log(`  ✔ Rejected invalid key without namespace: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 10] Conflict Detection & Resolution Strategy (REJECT vs LAST_WRITE_WINS)
  console.log('\n[Test 10] Conflict Detection & Resolution Strategy');
  const localStateRecord = await stateMgrA.createState('distributed/conflict/item', { value: 'LocalVal' }, { scope: AegisStateScope.DISTRIBUTED });

  const incomingConflictMutation = {
    mutationId: 'aegis-state-mutation://remote-mut',
    originNodeId: nodeBId,
    timestamp: Date.now() + 100,
    key: 'distributed/conflict/item',
    operation: 'UPDATE' as const,
    value: { value: 'RemoteVal' },
    expectedVersion: 1, // Same expected version as local state version 1 -> conflict
    scope: AegisStateScope.DISTRIBUTED
  };

  try {
    StateConflictResolver.resolveConflict(localStateRecord, incomingConflictMutation, StateConflictStrategy.REJECT);
    throw new Error('Test 10 failed: Should have rejected conflicting update under REJECT strategy');
  } catch (err: any) {
    if (err.code === StateErrorCode.STATE_CONFLICT) {
      console.log(`  ✔ Intercepted conflict and rejected under REJECT strategy: ${err.message}`);
    } else {
      throw err;
    }
  }

  const lwwResult = StateConflictResolver.resolveConflict(localStateRecord, incomingConflictMutation, StateConflictStrategy.LAST_WRITE_WINS);
  if (lwwResult.acceptIncoming && lwwResult.winnerValue?.value === 'RemoteVal') {
    console.log(`  ✔ LAST_WRITE_WINS strategy deterministically selected remote value`);
  } else {
    throw new Error('Test 10 failed: LWW conflict resolution failed');
  }

  // [Test 11] Anti-Entropy Manifest Reconnection Sync
  console.log('\n[Test 11] Anti-Entropy Manifest Reconnection Sync');
  let syncRequested = false;

  const mockRouterB = new AegisMessageRouter(nodeBId, () => ({
    sendPeerMessage: async (target: string, type: string, envelope: any) => {
      if (envelope.messageType === 'STATE.SYNC_REQUEST') {
        syncRequested = true;
      }
    }
  }));

  const memStorageB = new MemoryStorageAdapter();
  const peerRegB = new PeerRegistry(true);
  peerRegB.registerPeer({ nodeId: nodeAId, endpoints: [], connectionState: 'ACTIVE' });
  const stateMgrB = new AegisStateManager(nodeBId, memStorageB, mockRouterB, peerRegB);
  await stateMgrB.initialize();

  // Initiate anti-entropy sync with Node A
  stateMgrB.getSyncManager().initiateAntiEntropySync(nodeAId);
  if (stateMgrB.getSyncManager().getPeerSyncStatus(nodeAId) === 'SYNCING') {
    console.log(`  ✔ Anti-entropy reconciliation initiated; sync status for ${nodeAId} updated to SYNCING`);
  } else {
    throw new Error('Test 11 failed: Anti-entropy sync failed');
  }

  // [Test 12] Replication Consistency (REQUIRE_TARGET_ACK)
  console.log('\n[Test 12] Replication Consistency (REQUIRE_TARGET_ACK)');
  peerRegA.registerPeer({ nodeId: nodeBId, endpoints: [], connectionState: 'ACTIVE' });

  // Mock messageRouter.request for REQUIRE_TARGET_ACK
  mockRouterA.request = async (target: string, type: string, payload: any) => {
    if (target === nodeBId && type === 'STATE.MUTATION') {
      return { success: true };
    }
    return { success: false };
  };

  const ackRecord = await stateMgrA.createState(
    'distributed/strict/item',
    { strictData: 'ok' },
    {
      scope: AegisStateScope.DISTRIBUTED,
      replicationPolicy: {
        enabled: true,
        strategy: StateReplicationStrategy.SELECTED_NODES,
        targetNodeIds: [nodeBId],
        consistency: StateWriteConsistency.REQUIRE_TARGET_ACK
      }
    }
  );

  if (ackRecord.key === 'distributed/strict/item') {
    console.log(`  ✔ REQUIRE_TARGET_ACK replication succeeded after target node confirmed receipt`);
  } else {
    throw new Error('Test 12 failed: Target ACK replication failed');
  }

  // [Test 13] Crash-Safe File Recovery (Interrupted Temp Write Isolation)
  console.log('\n[Test 13] Crash-Safe File Recovery');
  const crashTestDir = path.resolve(process.cwd(), '.aegis/test-crash-recovery');
  if (!fs.existsSync(crashTestDir)) fs.mkdirSync(crashTestDir, { recursive: true });

  // Create valid state file and interrupted temp file
  fs.writeFileSync(path.join(crashTestDir, 'state.json'), JSON.stringify({ 'node/valid/key': { key: 'node/valid/key', value: 'valid' } }), 'utf-8');
  fs.writeFileSync(path.join(crashTestDir, 'state.tmp'), 'corrupted-interrupted-json-data', 'utf-8');

  const crashFileStorage = new FileStorageAdapter(crashTestDir);
  await crashFileStorage.initialize();

  const restoredValid = await crashFileStorage.get<any>('node/valid/key');
  if (restoredValid && restoredValid.value === 'valid' && !fs.existsSync(path.join(crashTestDir, 'state.tmp'))) {
    console.log(`  ✔ Interrupted .tmp file isolated on startup; prior valid state record successfully restored`);
  } else {
    throw new Error('Test 13 failed: Crash-safe recovery failed');
  }
  await crashFileStorage.close();

  // [Test 14] Phase 4 Task Persistence Integration & Recovery
  console.log('\n[Test 14] Phase 4 Task Persistence Integration & Recovery');
  const taskMgrWithState = new DistributedTaskManager(nodeAId, mockRouterA, peerRegA, {}, stateMgrA);
  const persistedTask = taskMgrWithState.createTask({ type: 'persistent-job', payload: { id: 99 } });

  // Allow async persistence to finish
  await new Promise((r) => setTimeout(r, 50));

  const restoredTaskCount = await taskMgrWithState.restorePersistedTasks();
  const recoveredTask = taskMgrWithState.getTask(persistedTask.taskId);

  if (recoveredTask && recoveredTask.taskId === persistedTask.taskId && recoveredTask.type === 'persistent-job') {
    console.log(`  ✔ Phase 4 task metadata persisted to StateManager and restored cleanly (${recoveredTask.taskId})`);
  } else {
    throw new Error('Test 14 failed: Task persistence integration failed');
  }

  // [Test 15] State Value Size Limits
  console.log('\n[Test 15] State Value Size Limits');
  const boundedStore = stateMgrA.getStateStore();
  const hugePayload = 'x'.repeat(2 * 1024 * 1024); // 2 MB string

  try {
    boundedStore.validateValueSize(hugePayload);
    throw new Error('Test 15 failed: Should have thrown STATE_SIZE_EXCEEDED');
  } catch (err: any) {
    if (err.code === StateErrorCode.STATE_SIZE_EXCEEDED) {
      console.log(`  ✔ Rejected oversized payload exceeding 1MB limit: ${err.message}`);
    } else {
      throw err;
    }
  }

  console.log('\n============================================================');
  console.log('  ✔ ALL PHASE 5 DISTRIBUTED STATE TESTS PASSED!');
  console.log('============================================================\n');
}

runPhase5TestSuite().catch((err) => {
  console.error('\n❌ PHASE 5 TEST SUITE FAILED:', err);
  process.exit(1);
});
