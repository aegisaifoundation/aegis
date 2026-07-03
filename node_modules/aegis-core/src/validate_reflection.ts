import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { memoryEventBus } from './memory/eventbus/MemoryEventBus.js';
import { memoryReflectionManager } from './memory/refinement/MemoryReflectionManager.js';
import { ReflectionHandler } from './memory/eventbus/handlers/ReflectionHandler.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
serviceRegistry.register('memoryEventBus', memoryEventBus);
serviceRegistry.register('memoryReflectionManager', memoryReflectionManager);

// Register handlers for testing
memoryEventBus.subscribe('session.archived', async (event) => {
  await ReflectionHandler.handleEvent(event);
});

async function runValidation() {
  console.log("=== AEGIS COGNITIVE REFLECTION VALIDATION ===");

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

  try {
    // 1. Initialize Memory Manager
    console.log("\n1. Initializing Memory System...");
    await memoryManager.initialize();
    assert(true, "MemoryManager initialized");

    const sessionId = 'test-reflection-session';
    await memoryManager.deleteSession(sessionId, 'system').catch(() => {});
    await memoryManager.createSession(sessionId, ['test', 'reflection'], 'agent');

    // 2. Populate Simulated History
    console.log("\n2. Appending Simulated Conversation History...");
    
    // Simulate user preference
    await memoryGateway.appendHistory(sessionId, {
      id: 'msg_u_1',
      role: 'user',
      content: 'remember to always configure port parameters',
      timestamp: new Date().toISOString()
    }, 'agent');

    // Simulate tool error
    await memoryGateway.appendHistory(sessionId, {
      id: 'msg_t_1',
      role: 'tool',
      content: 'FHIR service connection failed with status code 504 Gateway Timeout',
      timestamp: new Date().toISOString(),
      metadata: { toolName: 'FHIRConnector' }
    }, 'agent');

    // Simulate assistant completion
    await memoryGateway.appendHistory(sessionId, {
      id: 'msg_a_1',
      role: 'assistant',
      content: 'Resolved chest scan evaluation successfully and saved results.',
      timestamp: new Date().toISOString()
    }, 'agent');

    // 3. Test Reflection Generation
    console.log("\n3. Generating Reflections...");
    const reflection = await memoryReflectionManager.reflect(sessionId, 'agent');
    
    assert(reflection !== null, "Reflection record successfully generated");
    assert(reflection!.whatFailed.some(f => f.includes('FHIR service connection failed')), "Reflected whatFailed correctly contains tool error");
    assert(reflection!.whatWorked.some(w => w.includes('Resolved chest scan evaluation')), "Reflected whatWorked correctly contains assistant completion");
    assert(reflection!.futureRules.some(r => r.includes('Always implement timeout retry logic')), "Extracted future rule from tool failure");
    assert(reflection!.futureRules.some(r => r.includes('Clinician preference')), "Extracted future rule from user command");

    // 4. Verify reflections.json
    console.log("\n4. Verifying reflections.json database creation...");
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const dbPath = path.resolve(wsRoot, 'memory/reflections/reflections.json');
    
    assert(existsSync(dbPath), "reflections.json database file created");
    const rawReflections = await fs.readFile(dbPath, 'utf8');
    const list = JSON.parse(rawReflections);
    assert(list.length >= 1, "At least 1 reflection record saved in database");
    assert(list[list.length - 1].sessionId === sessionId, "Saved reflection matches current sessionId");

    // 5. Verify Session state preferences integration
    console.log("\n5. Verifying Session State Preferences updating...");
    const state = await memoryGateway.getSessionState(sessionId, 'agent');
    const futureRules = state.preferences?.futureRules || [];
    
    assert(futureRules.length >= 2, "Session state preferences populated with future rules");
    assert(futureRules.some((r: string) => r.includes('Always implement timeout retry logic')), "Preferences contain timeout rule");

    // 6. Test automated event-driven execution (Archiving)
    console.log("\n6. Testing Event-Driven Automated Reflection on Archiving...");
    await memoryManager.archiveSession(sessionId, 'agent');
    
    // Wait for the asynchronous EventBus + ReflectionHandler to run reflect()
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const records = await memoryReflectionManager.getSessionReflections(sessionId);
    assert(records.length >= 2, "Event trigger successfully added second reflection record");

    // Cleanup
    await memoryManager.deleteSession(sessionId, 'system');
    await memoryManager.shutdown();

  } catch (err: any) {
    assert(false, `Reflection Validation threw unexpected error: ${err.message}\n${err.stack}`);
  }

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Memory Reflection validation completed successfully!");
    process.exit(0);
  }
}

runValidation().catch(e => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
