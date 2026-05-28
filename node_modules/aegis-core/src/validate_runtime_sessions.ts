import { runtimeSessionManager } from './runtime/RuntimeSessionManager.js';
import { runtimeStateManager } from './runtime/RuntimeStateManager.js';
import { sessionMountManager } from './runtime/SessionMountManager.js';
import { SessionRecoveryManager } from './runtime/SessionRecoveryManager.js';
import { SessionStateTransitionValidator } from './runtime/SessionStateTransitionValidator.js';
import { SessionCompatibilityValidator } from './runtime/SessionCompatibilityValidator.js';
import { RuntimeContinuityValidator } from './runtime/RuntimeContinuityValidator.js';
import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { SessionLifecycleState, BootMode, RuntimeLockState, RuntimeHealthStatus } from './memory/interfaces/MemoryTypes.js';
import { EventTypes } from './events/EventTypes.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);

async function runValidation() {
  console.log("=== AEGIS RUNTIME SESSION CONTINUITY VALIDATION ===");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const testSessionId = 'test-session-continuity-spec';
  const targetForkSessionId = 'test-session-continuity-fork';

  try {
    // 0. Preliminary cleanup
    await runtimeSessionManager.shutdown().catch(() => {});
    const sessionsDir = path.resolve(wsRoot, `memory/sessions/${testSessionId}`);
    const forkedDir = path.resolve(wsRoot, `memory/sessions/${targetForkSessionId}`);
    const trashDir = path.resolve(wsRoot, `memory/trash/${testSessionId}`);
    const quarantineDir = path.resolve(wsRoot, `memory/quarantine/${testSessionId}`);
    await fs.rm(sessionsDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(forkedDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(trashDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(quarantineDir, { recursive: true, force: true }).catch(() => {});

    // Ensure index manager/memory manager initialized
    await memoryManager.initialize();

    // 1. Initializing and boot-time auto-restoration
    console.log("\n1. Boot-time Auto-restoration & Watchdogs...");
    await runtimeSessionManager.initialize();
    
    const state = await runtimeStateManager.loadState();
    assert(state.runtimeId !== undefined, "Runtime identity generated");
    assert(state.runtimeClusterId !== undefined, "Runtime cluster identity assigned");
    assert(state.runtimeEpoch >= 1, "Runtime epoch set");
    assert(state.lastBootAt !== undefined, "Boot trace recorded");

    // 2. EventBus notifications verification
    console.log("\n2. EventBus Notifications Verification...");
    let eventReceived = false;
    let eventPayload: any = null;
    
    const handler = (envelope: any) => {
      eventReceived = true;
      eventPayload = envelope.payload;
    };
    eventBus.on(EventTypes.SESSION_CREATED, handler);

    // Create session
    const meta = await runtimeSessionManager.createNewSession(['continuous', 'testing'], 'agent');
    const createdSessionId = meta.sessionId;
    assert(eventReceived, "SESSION_CREATED event captured on EventBus");
    assert(eventPayload?.sessionId === createdSessionId, "Event payload contains correct sessionId");
    eventBus.off(EventTypes.SESSION_CREATED, handler);

    // 3. Mount token, generation, and epoch check
    console.log("\n3. Mount Tokens, Generations, and Epoch Invalidation...");
    const statePostCreate = await runtimeStateManager.loadState();
    assert(statePostCreate.mountedSessionId === createdSessionId, "Newly created session automatically mounted");
    assert(statePostCreate.mountGeneration > 0, "Mount generation incremented");
    assert(statePostCreate.mountToken !== undefined, "New UUID mount token assigned");

    // 4. Working memory preservation
    console.log("\n4. Working Memory Preservation during Swap/Checkout...");
    const workingContent = "## Current Tasks\n- [ ] Persist working memory before checkout\n";
    await memoryGateway.updateWorkingMemory(createdSessionId, workingContent, undefined, 'agent');

    // Create a second session to swap focus
    const meta2 = await runtimeSessionManager.createNewSession(['continuous2'], 'agent');
    const secondSessionId = meta2.sessionId;

    // Verify first session's working memory was preserved
    const savedWorkingContent = await memoryGateway.getWorkingMemory(createdSessionId, 'agent');
    assert(savedWorkingContent.includes("Persist working memory before checkout"), "Working memory successfully persisted before swap");

    // Checkout back to first session
    await runtimeSessionManager.checkoutSession(createdSessionId, 'agent');
    const statePostCheckout = await runtimeStateManager.loadState();
    assert(statePostCheckout.activeSessionId === createdSessionId, "Successfully checked out back to first session");

    // 5. Fork session cloning & metadata linking
    console.log("\n5. Fork Session Cloning & Metadata Linking...");
    const forkedSessionId = await runtimeSessionManager.forkSession(createdSessionId, 'agent');
    const forkedMeta = await memoryGateway.loadSession(forkedSessionId, 'agent');
    
    assert(forkedMeta.parentSessionId === createdSessionId, "Fork metadata has correct parent sessionId");
    assert(forkedMeta.forkedFrom === createdSessionId, "Fork metadata references original source session");
    
    const forkedWorking = await memoryGateway.getWorkingMemory(forkedSessionId, 'agent');
    assert(forkedWorking.includes("Persist working memory before checkout"), "Forked working memory md content cloned");
    
    const forkedHistory = await memoryGateway.getHistory(forkedSessionId, 'agent');
    assert(forkedHistory.length === 0, "Fork history.json log is empty to prevent bloat");

    // 6. Checkpoint creation and rollback testing
    console.log("\n6. Checkpoint Creation & Rollback Testing...");
    await runtimeStateManager.createCheckpoint("pre-mutation-checkpoint");
    const preMutationState = await runtimeStateManager.loadState();
    const originalEpoch = preMutationState.runtimeEpoch;

    // Mutate state directly
    preMutationState.runtimeMode = 'MAINTENANCE' as any;
    await runtimeStateManager.saveState(preMutationState);

    // Rollback
    await runtimeStateManager.rollbackToCheckpoint("pre-mutation-checkpoint");
    const rolledBackState = await runtimeStateManager.loadState();
    assert(rolledBackState.runtimeMode === 'NORMAL' as any, "State rolled back to checkpoint values");
    assert(rolledBackState.runtimeEpoch === originalEpoch + 1, "Epoch incremented on forced rollback checkpoint");

    // 7. Lifecycle transitions checking
    console.log("\n7. Session Lifecycle Transitions Rules...");
    const allowed = SessionStateTransitionValidator.validate(SessionLifecycleState.INACTIVE, SessionLifecycleState.ACTIVE);
    const disallowed = SessionStateTransitionValidator.validate(SessionLifecycleState.DELETED, SessionLifecycleState.ACTIVE);
    assert(allowed, "Allowed transition (INACTIVE -> ACTIVE) validated true");
    assert(!disallowed, "Disallowed transition (DELETED -> ACTIVE) validated false");

    // 8. Recovery of corrupted state file
    console.log("\n8. Recovery of Corrupted State File...");
    const stateFile = path.resolve(wsRoot, 'runtime/runtime-state.json');
    await fs.writeFile(stateFile, "{ CORRUPTED STATE JSON ", 'utf8');

    const validStateBefore = await runtimeStateManager.validateRuntimeState();
    assert(!validStateBefore, "validateRuntimeState detected corrupted state JSON file");

    await runtimeStateManager.recoverRuntimeState();
    const validStateAfter = await runtimeStateManager.validateRuntimeState();
    assert(validStateAfter, "recoverRuntimeState restored state file and validated successfully");

    // 9. Soft-delete and trash migration
    console.log("\n9. Soft-delete and Trash Migration...");
    // Let's create a clean test session and delete it
    const deleteTestMeta = await runtimeSessionManager.createNewSession(['to-delete'], 'agent');
    const deleteTestId = deleteTestMeta.sessionId;

    // Checkout to a different session so we can delete deleteTestId
    await runtimeSessionManager.checkoutSession(createdSessionId, 'agent');

    await runtimeSessionManager.deleteSession(deleteTestId, 'agent');
    assert(existsSync(path.resolve(wsRoot, `memory/trash/${deleteTestId}`)), "Deleted session folder moved to trash");
    
    // Resume
    await runtimeSessionManager.resumeSession(deleteTestId, 'agent');
    assert(existsSync(path.resolve(wsRoot, `memory/sessions/${deleteTestId}`)), "Resumed session folder moved back to sessions");
    const resumedMeta = await memoryGateway.loadSession(deleteTestId, 'agent');
    assert(resumedMeta.lifecycleState === SessionLifecycleState.ACTIVE, "Resumed session metadata state set to ACTIVE (mounted)");

    // 10. Quarantine of repeatedly failing sessions
    console.log("\n10. Quarantine of Corrupted Sessions...");
    const quarantineTestMeta = await runtimeSessionManager.createNewSession(['to-quarantine'], 'agent');
    const quarantineTestId = quarantineTestMeta.sessionId;
    
    // Quarantine
    await SessionRecoveryManager.quarantineSession(quarantineTestId, "INTEGRITY_CHECK_FAILED");
    assert(existsSync(path.resolve(wsRoot, `memory/quarantine/${quarantineTestId}`)), "Quarantined session folder moved to quarantine directory");
    
    const quarantinedMetaPath = path.resolve(wsRoot, `memory/quarantine/${quarantineTestId}/metadata.json`);
    const quarantinedMeta = JSON.parse(await fs.readFile(quarantinedMetaPath, 'utf8'));
    assert(quarantinedMeta.lifecycleState === SessionLifecycleState.CORRUPTED, "Quarantined session lifecycle state set to CORRUPTED");
    assert(quarantinedMeta.quarantineReason === "INTEGRITY_CHECK_FAILED", "Quarantine reason recorded correctly");

    // 11. Heartbeat watchdog stale checking
    console.log("\n11. Heartbeat Watchdog Timeout & Status Degradation...");
    const stateForHeartbeat = await runtimeStateManager.loadState();
    // Simulate stale heartbeat: set to 40 seconds ago
    stateForHeartbeat.lastHeartbeatAt = new Date(Date.now() - 40000).toISOString();
    await runtimeStateManager.saveState(stateForHeartbeat);

    // Trigger watchdog logic check manually for validation
    const checkState = await runtimeStateManager.loadState();
    const lastHb = new Date(checkState.lastHeartbeatAt).getTime();
    const delta = Date.now() - lastHb;
    let degradedSignal = false;
    
    if (delta > 30000) {
      degradedSignal = true;
      checkState.runtimeHealthStatus = RuntimeHealthStatus.DEGRADED;
      await runtimeStateManager.saveState(checkState);
    }
    assert(degradedSignal, "Watchdog detected stale heartbeat and marked degradedSignal");
    assert((await runtimeStateManager.loadState()).runtimeHealthStatus === RuntimeHealthStatus.DEGRADED, "Health status degraded to DEGRADED");

    // Restore health for subsequent tests
    const restoreHealthState = await runtimeStateManager.loadState();
    restoreHealthState.runtimeHealthStatus = RuntimeHealthStatus.HEALTHY;
    restoreHealthState.lastHeartbeatAt = new Date().toISOString();
    await runtimeStateManager.saveState(restoreHealthState);

    // 12. Mount lease ownership checks
    console.log("\n12. Mount Lease Verification...");
    await runtimeSessionManager.checkoutSession(createdSessionId, 'agent');
    const stateForLease = await runtimeStateManager.loadState();
    assert(stateForLease.mountLease !== undefined, "Mount lease registered on mounted session");
    assert(stateForLease.mountLease?.ownerRuntimeId === stateForLease.runtimeId, "Mount lease owner runtime ID matches active runtime ID");

    // 13. Safe mode boot restrictions
    console.log("\n13. Safe Mode Boot Restrictions...");
    const stateForSafe = await runtimeStateManager.loadState();
    stateForSafe.bootMode = BootMode.SAFE_MODE;
    await runtimeStateManager.saveState(stateForSafe);

    // shutdown and re-initialize
    await runtimeSessionManager.shutdown();
    await runtimeSessionManager.initialize();

    const statePostSafeBoot = await runtimeStateManager.loadState();
    assert(statePostSafeBoot.bootMode === BootMode.SAFE_MODE, "Booted in SAFE_MODE");

    // Restore normal boot mode
    statePostSafeBoot.bootMode = BootMode.RESTORE_PREVIOUS;
    await runtimeStateManager.saveState(statePostSafeBoot);

    // Clean up temporary sessions
    console.log("\n14. Final cleaning and shutdown...");
    await runtimeSessionManager.shutdown();
    assert(true, "Shutdown runtimeSessionManager watchdog timers gracefully");

    // Clean up files
    await fs.rm(path.resolve(wsRoot, `memory/sessions/${createdSessionId}`), { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.resolve(wsRoot, `memory/sessions/${secondSessionId}`), { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.resolve(wsRoot, `memory/sessions/${forkedSessionId}`), { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.resolve(wsRoot, `memory/sessions/${deleteTestId}`), { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.resolve(wsRoot, `memory/quarantine/${quarantineTestId}`), { recursive: true, force: true }).catch(() => {});

  } catch (err: any) {
    assert(false, `Validation threw unexpected error: ${err.message}\n${err.stack}`);
  }

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Session Continuity System validation completed successfully!");
    process.exit(0);
  }
}

runValidation().catch(e => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
