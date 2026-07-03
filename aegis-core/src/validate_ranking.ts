import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { memoryRankingManager } from './memory/refinement/MemoryRankingManager.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
serviceRegistry.register('memoryRankingManager', memoryRankingManager);

async function runValidation() {
  console.log("=== AEGIS COGNITIVE IMPORTANCE RANKING & AGING VALIDATION ===");

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

    const sessionId = 'test-ranking-session';
    
    // Clear old state
    await memoryRankingManager.load();
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const dbPath = path.resolve(wsRoot, 'memory/indexes/ranking.json');
    if (existsSync(dbPath)) {
      await fs.unlink(dbPath).catch(() => {});
    }

    // 2. Insert test memories with different parameters
    console.log("\n2. Inserting Test Memories with varying Importance & Decay rates...");
    
    const itemId1 = "mem_critical_allergy";
    const itemId2 = "mem_casual_greeting";
    
    // Item 1: High value, low decay
    await memoryRankingManager.insert(itemId1, sessionId, "Critical patient allergy: Penicillin", 0.9, 0.9, 0.01);
    
    // Item 2: Low value, high decay
    await memoryRankingManager.insert(itemId2, sessionId, "User said hello on first connection", 0.2, 0.2, 0.2);
    
    const items = await memoryRankingManager.getSessionItems(sessionId);
    assert(items.length === 2, "Both memory items inserted in database");

    // 3. Test Access Frequency Tracking
    console.log("\n3. Testing Access Frequency tracking...");
    await memoryRankingManager.recordAccess(itemId1);
    await memoryRankingManager.recordAccess(itemId1);
    
    const updatedItems = await memoryRankingManager.getSessionItems(sessionId);
    const allergyItem = updatedItems.find(i => i.id === itemId1);
    assert(allergyItem?.accessFrequency === 3, "Allergy item access frequency successfully tracked to 3");

    // 4. Test Immediate Scoring
    console.log("\n4. Testing Score Calculation at current timestamp...");
    const score1Immediate = memoryRankingManager.calculateScore(allergyItem!);
    const greetingItem = updatedItems.find(i => i.id === itemId2);
    const score2Immediate = memoryRankingManager.calculateScore(greetingItem!);
    
    assert(score1Immediate > score2Immediate, "High importance item has significantly higher priority score");

    // 5. Test Temporal Decay & Sweep Demotion
    console.log("\n5. Testing 30-day Temporal Decay Simulation & Aging Sweep...");
    
    // Simulate passing of 30 days (in milliseconds)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    const score1Future = memoryRankingManager.calculateScore(allergyItem!, thirtyDaysMs);
    const score2Future = memoryRankingManager.calculateScore(greetingItem!, thirtyDaysMs);
    
    console.log(`- Score Allergy (30 days): ${score1Future.toFixed(4)}`);
    console.log(`- Score Greeting (30 days): ${score2Future.toFixed(4)}`);
    
    assert(score1Future > 0.5, "Critical allergy memory remains active after 30 days");
    assert(score2Future < 0.1, "Casual greeting memory decays to near zero after 30 days");

    // Run Aging Sweep
    const sweepResult = await memoryRankingManager.sweepSessionMemory(sessionId, thirtyDaysMs, 0.3);
    
    assert(sweepResult.active.some(i => i.id === itemId1), "Critical allergy memory remains in active memory set");
    assert(sweepResult.archived.some(i => i.id === itemId2), "Stale greeting memory was demoted and archived");

    // Verify file creation in archives
    console.log("\n6. Verifying Archives Folder output...");
    const archiveDir = path.resolve(wsRoot, 'memory/archives');
    assert(existsSync(archiveDir), "archives/ directory was created");
    
    const archives = await fs.readdir(archiveDir);
    assert(archives.length >= 1, "At least 1 archive record JSON file was written");
    
    const archiveContent = await fs.readFile(path.join(archiveDir, archives[0]), 'utf8');
    const record = JSON.parse(archiveContent);
    assert(record.sessionId === sessionId, "Archive record contains correct sessionId");
    assert(record.items.some((i: any) => i.id === itemId2), "Archive record contains the demoted memory");

    // Cleanup
    await fs.unlink(dbPath).catch(() => {});
    for (const f of archives) {
      await fs.unlink(path.join(archiveDir, f)).catch(() => {});
    }
    await memoryManager.shutdown();

  } catch (err: any) {
    assert(false, `Ranking Validation threw unexpected error: ${err.message}\n${err.stack}`);
  }

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Memory Importance & Aging validation completed successfully!");
    process.exit(0);
  }
}

runValidation().catch(e => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
