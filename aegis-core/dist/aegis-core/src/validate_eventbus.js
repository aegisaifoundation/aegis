import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { memoryEventBus } from './memory/eventbus/MemoryEventBus.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
serviceRegistry.register('memoryEventBus', memoryEventBus);
// Register AuditLogger subscription manually for this validation
import { AuditLogger } from './memory/eventbus/handlers/AuditLogger.js';
memoryEventBus.subscribe('*', async (event) => {
    await AuditLogger.handleEvent(event);
});
async function runValidation() {
    console.log("=== AEGIS COGNITIVE MEMORY EVENT BUS VALIDATION ===");
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
    const eventsReceived = [];
    const subId = memoryEventBus.subscribe('*', (event) => {
        eventsReceived.push(event);
    });
    try {
        // 1. Initialize Memory Manager
        console.log("\n1. Initializing Memory System...");
        await memoryManager.initialize();
        assert(true, "MemoryManager initialized");
        const sessionId = 'test-event-bus-session';
        await memoryManager.deleteSession(sessionId, 'system').catch(() => { });
        // 2. Create Session
        console.log("\n2. Creating Session & Verifying Event...");
        await memoryManager.createSession(sessionId, ['event-bus', 'validation'], 'agent');
        // Give event bus a short tick to process async subscriptions
        await new Promise(resolve => setTimeout(resolve, 50));
        const createdEvent = eventsReceived.find(e => e.topic === 'session.created');
        assert(createdEvent !== undefined, "session.created event was published");
        assert(createdEvent?.sessionId === sessionId, "session.created event contains correct sessionId");
        assert(createdEvent?.actor === 'agent', "session.created event contains correct actor");
        // 3. Update Working Memory
        console.log("\n3. Updating Working Memory & Verifying Event...");
        const workingContent = '## Current Tasks\n- [ ] Task Event Bus Test\n';
        await memoryGateway.updateWorkingMemory(sessionId, workingContent, undefined, 'agent');
        await new Promise(resolve => setTimeout(resolve, 50));
        const workingEvent = eventsReceived.find(e => e.topic === 'workingMemory.updated');
        assert(workingEvent !== undefined, "workingMemory.updated event was published");
        assert(workingEvent?.payload.content === workingContent, "workingMemory.updated payload contains updated content");
        // 4. Append History
        console.log("\n4. Appending History & Verifying Event...");
        const mockMessage = {
            id: 'msg_test_123',
            role: 'user',
            content: 'verify history append events',
            timestamp: new Date().toISOString()
        };
        await memoryGateway.appendHistory(sessionId, mockMessage, 'agent');
        await new Promise(resolve => setTimeout(resolve, 50));
        const historyEvent = eventsReceived.find(e => e.topic === 'history.appended');
        assert(historyEvent !== undefined, "history.appended event was published");
        assert(historyEvent?.payload.message.id === 'msg_test_123', "history.appended payload contains message ID");
        // 5. Delete Session
        console.log("\n5. Deleting Session & Verifying Event...");
        await memoryManager.deleteSession(sessionId, 'system');
        await new Promise(resolve => setTimeout(resolve, 50));
        const deletedEvent = eventsReceived.find(e => e.topic === 'session.deleted');
        assert(deletedEvent !== undefined, "session.deleted event was published");
        // 6. Verify Audit Logs
        console.log("\n6. Verifying Audit Log file generation...");
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const logPath = path.resolve(wsRoot, 'memory/analytics/audit.jsonl');
        assert(existsSync(logPath), "audit.jsonl file was created");
        const rawLogs = await fs.readFile(logPath, 'utf8');
        const logLines = rawLogs.trim().split('\n').filter(Boolean);
        assert(logLines.length >= 4, "At least 4 audit logs written to audit.jsonl");
        const sessionLogs = logLines.map(l => JSON.parse(l)).filter(log => log.sessionId === sessionId);
        assert(sessionLogs.length > 0, "Audit log entries contain correct sessionId");
        // Cleanup
        memoryEventBus.unsubscribe(subId);
        await memoryManager.shutdown();
    }
    catch (err) {
        assert(false, `Event Bus Validation threw unexpected error: ${err.message}\n${err.stack}`);
    }
    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    if (failed > 0) {
        process.exit(1);
    }
    else {
        console.log("Memory Event Bus validation completed successfully!");
        process.exit(0);
    }
}
runValidation().catch(e => {
    console.error("Test runner failed:", e);
    process.exit(1);
});
