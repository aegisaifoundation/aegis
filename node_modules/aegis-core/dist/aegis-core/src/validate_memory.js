import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { readMemoryFile } from './memory/utils/MemoryFileHelpers.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
async function runValidation() {
    console.log("=== AEGIS MEMORY SYSTEM VALIDATION ===");
    let passed = 0;
    let failed = 0;
    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passed++;
        }
        else {
            console.error(`[FAIL] ${message}`);
            failed++;
        }
    }
    try {
        // 1. Initialize
        console.log("\n1. Initializing Memory System...");
        await memoryManager.initialize();
        assert(true, "MemoryManager initialized successfully");
        // 2. Create Session
        console.log("\n2. Creating Session...");
        const sessionId = 'test-validation-session';
        // Clean up if exists
        await memoryManager.deleteSession(sessionId, 'system').catch(() => { });
        const meta = await memoryManager.createSession(sessionId, ['test', 'validation'], 'agent');
        assert(meta.sessionId === sessionId, "Session created with correct ID");
        assert(meta.tags.includes('validation'), "Session contains correct tags");
        assert(meta.lifecycleState === 'ACTIVE', "Session is in ACTIVE state");
        // Check directory layout
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
        assert(existsSync(path.join(sessionDir, 'metadata.json')), "metadata.json exists");
        assert(existsSync(path.join(sessionDir, 'history.json')), "history.json exists");
        assert(existsSync(path.join(sessionDir, 'session-memory.md')), "session-memory.md exists");
        assert(existsSync(path.join(sessionDir, 'working-memory.md')), "working-memory.md exists");
        assert(existsSync(path.join(sessionDir, 'task.md')), "task.md exists");
        // 3. Operations & History Append
        console.log("\n3. Testing Interaction Log Appends...");
        await memoryManager.appendHistory(sessionId, 'user', 'remember to always use dark mode preferred', {}, 'agent');
        const history = await memoryGateway.getHistory(sessionId, 'agent');
        assert(history.length === 1, "One history record appended");
        assert(history[0].content === 'remember to always use dark mode preferred', "History content matches");
        // 4. Working Memory Update
        console.log("\n4. Testing Working Memory, Tasks & Limits...");
        const initialWorking = '## Intermediate Conclusions\n- Compiling looks good\n';
        await memoryManager.updateWorkingMemory(sessionId, initialWorking, 'agent');
        const workingContent = await memoryManager.getWorkingMemory(sessionId, 'agent');
        assert(workingContent.includes('Compiling looks good'), "Working memory written successfully");
        const initialTask = '# Tasks\n- [ ] Code completion\n- [x] Run compilation\n\n# Active Tasks\n- [ ] Code completion\n- [x] Run compilation\n';
        await memoryManager.updateTask(sessionId, initialTask, 'agent');
        const taskContent = await memoryManager.getTask(sessionId, 'agent');
        assert(taskContent.includes('Code completion'), "Task memory written successfully");
        // 5. Checksums & Verification
        console.log("\n5. Testing Integrity Checks...");
        const metaReload = await memoryManager.loadSession(sessionId, 'agent');
        assert(metaReload.checksums.workingMemory !== undefined, "Checksum stored for working memory");
        assert(metaReload.checksums.task !== undefined, "Checksum stored for task memory");
        // 6. Memory Refinement & Compaction
        console.log("\n6. Compressing and Refining...");
        await memoryManager.compress(sessionId, 'agent');
        const refinedTask = await memoryManager.getTask(sessionId, 'agent');
        const refinedSession = await memoryManager.getSessionMemory(sessionId, 'agent');
        // Pruning assertion (Task 2 was marked [x] so it should be pruned)
        assert(!refinedTask.includes('Run compilation'), "Completed task successfully pruned from task memory");
        assert(refinedTask.includes('Code completion'), "Active task retained in task memory");
        // Extraction assertion (User said "remember to always use dark mode preferred")
        assert(refinedSession.includes('remember to always use dark mode preferred'), "Fact extracted and refined into session-memory.md");
        // 7. Snapshot System...
        console.log("\n7. Snapshot System...");
        const snapsDir = path.resolve(wsRoot, `memory/snapshots/${sessionId}`);
        assert(existsSync(snapsDir), "Snapshots folder created for session");
        const snaps = await fs.readdir(snapsDir);
        assert(snaps.length >= 3, "Created working, session, and task memory snapshots before compression");
        // 8. Transactions & Rollback
        console.log("\n8. Memory Transactions...");
        const { memoryTransactionManager } = await import('./memory/transactions/MemoryTransactionManager.js');
        const txId = 'test-tx-fail';
        memoryTransactionManager.beginTransaction(txId);
        const targetFile = path.join(sessionDir, 'working-memory.md');
        const preContent = await readMemoryFile(targetFile);
        await memoryTransactionManager.registerWrite(txId, targetFile, 'GARBAGE DATA');
        // Simulate failure and roll back
        await memoryTransactionManager.rollbackTransaction(txId);
        const postContent = await readMemoryFile(targetFile);
        assert(preContent === postContent, "Transaction rollback restored original content");
        // 9. Permissions checks
        console.log("\n9. Permission Enforcements...");
        let permThrew = false;
        try {
            // 'visitor' is not in the list of allowed writers
            await memoryManager.updateWorkingMemory(sessionId, 'Some content', 'visitor');
        }
        catch {
            permThrew = true;
        }
        assert(permThrew, "Writer role restriction enforced successfully");
        // 10. Self-Repair and Recovery
        console.log("\n10. Testing Memory Recovery System...");
        // Let's corrupt history.json and verify it gets recovered from the snapshots
        const historyPath = path.join(sessionDir, 'history.json');
        await fs.writeFile(historyPath, "{ CORRUPTED JSON ", 'utf8');
        const metaIntegrity = await memoryManager.loadSession(sessionId, 'agent');
        assert(metaIntegrity !== null, "Corrupt session successfully recovered and loaded");
        const recoveredHistory = await memoryGateway.getHistory(sessionId, 'agent');
        assert(recoveredHistory.length > 0, "History successfully restored from snapshot");
        // 11. Cleanup
        console.log("\n11. Cleaning up...");
        await memoryManager.deleteSession(sessionId, 'system');
        assert(!existsSync(sessionDir), "Session data deleted cleanly");
        await memoryManager.shutdown();
    }
    catch (err) {
        assert(false, `Validation threw unexpected error: ${err.message}\n${err.stack}`);
    }
    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    if (failed > 0) {
        process.exit(1);
    }
    else {
        console.log("Memory System validation completed successfully!");
        process.exit(0);
    }
}
runValidation().catch(e => {
    console.error("Test runner failed:", e);
    process.exit(1);
});
