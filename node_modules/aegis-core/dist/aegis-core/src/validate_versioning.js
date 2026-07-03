import { memoryManager } from './memory/MemoryManager.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { memoryCompressionManager } from './memory/refinement/MemoryCompressionManager.js';
import { memoryConflictResolver } from './memory/refinement/MemoryConflictResolver.js';
// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
serviceRegistry.register('memoryCompressionManager', memoryCompressionManager);
serviceRegistry.register('memoryConflictResolver', memoryConflictResolver);
async function runValidation() {
    console.log("=== AEGIS COGNITIVE COMPACTION & CONFLICT RESOLUTION VALIDATION ===");
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
        // 1. Initialize Memory Manager
        console.log("\n1. Initializing Memory System...");
        await memoryManager.initialize();
        assert(true, "MemoryManager initialized");
        const sessionId = 'test-versioning-session';
        // 2. Test History Compression / Compaction
        console.log("\n2. Testing AI-Based History Compaction...");
        const mockHistory = [
            {
                id: 'msg_1',
                role: 'user',
                content: 'Our goal is to verify DICOM header attributes for patient scan.',
                timestamp: new Date().toISOString()
            },
            {
                id: 'msg_2',
                role: 'user',
                content: 'remember to always check patient ID matches the registry',
                timestamp: new Date().toISOString()
            },
            {
                id: 'msg_3',
                role: 'assistant',
                content: 'I have completed verification and resolved active matches.',
                timestamp: new Date().toISOString()
            },
            {
                id: 'msg_4',
                role: 'tool',
                content: 'Error: Database connection failed during record fetch',
                timestamp: new Date().toISOString()
            }
        ];
        const compressed = await memoryCompressionManager.compressHistory(sessionId, mockHistory);
        assert(compressed.goals.some(g => g.includes('verify DICOM')), "Compressed goals contain the correct objective");
        assert(compressed.facts.some(f => f.includes('patient ID matches')), "Compressed facts contain preference directives");
        assert(compressed.decisions.some(d => d.includes('completed verification')), "Compressed decisions contain completed tasks");
        assert(compressed.risks.some(r => r.includes('Database connection failed')), "Compressed risks contain error traces");
        // 3. Test Session State Merge Conflict Resolution
        console.log("\n3. Testing Session State Conflict Resolution...");
        const localState = {
            sessionId,
            status: 'ACTIVE',
            currentObjective: "Assess chest scan DICOMs",
            activeTasks: ["Review chest scans", "Consult radiologist"],
            lastUpdatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            checkpointVersion: 1,
            preferences: { preferredModel: "Ollama-Gemma4" },
            temporaryExecutionContext: { connectionPort: 11434 }
        };
        const remoteState = {
            sessionId,
            status: 'ACTIVE',
            currentObjective: "Assess cardiac scan DICOMs",
            activeTasks: ["Review chest scans", "Check vital stats"],
            lastUpdatedAt: new Date().toISOString(), // Current timestamp (newer)
            checkpointVersion: 2, // Higher checkpoint
            preferences: { preferredModel: "Local-Gemma4-Q8", priority: "high" },
            temporaryExecutionContext: { connectionPort: 11435 }
        };
        const mergeResult = memoryConflictResolver.resolve(localState, remoteState);
        assert(mergeResult.mergedState.currentObjective === "Assess cardiac scan DICOMs", "Newer remote checkpoint objective won the merge conflict");
        // Check list mergers (should be merged and deduplicated)
        const activeTasks = mergeResult.mergedState.activeTasks || [];
        assert(activeTasks.length === 3, "Merged active tasks list deduplicated correctly");
        assert(activeTasks.includes("Review chest scans") && activeTasks.includes("Consult radiologist") && activeTasks.includes("Check vital stats"), "Tasks list contains items from both states");
        // Check preferences merges
        const preferences = mergeResult.mergedState.preferences || {};
        assert(preferences.preferredModel === "Local-Gemma4-Q8", "Preferences conflict resolved to remote model");
        assert(preferences.priority === "high", "Preferences additive properties merged correctly");
        // Check context merges
        const context = mergeResult.mergedState.temporaryExecutionContext || {};
        assert(context.connectionPort === 11435, "Context conflict resolved to remote port");
        assert(mergeResult.mergedState.checkpointVersion === 3, "Checkpoint version bumped correctly on successful merge");
        await memoryManager.shutdown();
    }
    catch (err) {
        assert(false, `Compaction & Versioning Validation threw unexpected error: ${err.message}\n${err.stack}`);
    }
    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    if (failed > 0) {
        process.exit(1);
    }
    else {
        console.log("Memory Compaction & Conflict Resolution validation completed successfully!");
        process.exit(0);
    }
}
runValidation().catch(e => {
    console.error("Test runner failed:", e);
    process.exit(1);
});
