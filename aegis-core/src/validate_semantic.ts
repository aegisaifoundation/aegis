import { memoryManager } from './memory/MemoryManager.js';
import { memoryGateway } from './memory/MemoryGateway.js';
import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus } from './runtime/EventBus.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { loadEnvironment } from './utils/environment.js';
import { memoryEventBus } from './memory/eventbus/MemoryEventBus.js';
import { memoryEmbeddingManager } from './memory/embedding/MemoryEmbeddingManager.js';
import { vectorSearchProvider } from './memory/search/VectorSearchProvider.js';
import { memorySearchManager } from './memory/search/MemorySearchManager.js';
import { EmbeddingHandler } from './memory/eventbus/handlers/EmbeddingHandler.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Initialize core environment
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('workspaceManager', workspaceManager);
serviceRegistry.register('memoryEventBus', memoryEventBus);
serviceRegistry.register('memoryEmbeddingManager', memoryEmbeddingManager);
serviceRegistry.register('memorySearchManager', memorySearchManager);

// Register handlers for testing
memoryEventBus.subscribe('workingMemory.updated', async (event) => {
  await EmbeddingHandler.handleEvent(event);
});

async function runValidation() {
  console.log("=== AEGIS COGNITIVE SEMANTIC SEARCH VALIDATION ===");

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

    // 2. Test Embedding Generation
    console.log("\n2. Generating Text Embeddings...");
    const sampleText = "Patient was diagnosed with pneumonia and prescribed antibiotics.";
    const vector = await memoryEmbeddingManager.generate(sampleText);
    
    assert(Array.isArray(vector), "Vector is an array");
    assert(vector.length === 768, "Embedding dimension is exactly 768");
    
    // Check normalization (L2 norm should be close to 1)
    let sum = 0;
    for (const v of vector) {
      sum += v * v;
    }
    const norm = Math.sqrt(sum);
    assert(Math.abs(norm - 1.0) < 1e-5, "Embedding vector is properly L2-normalized");

    // 3. Test Vector Search Cosine Similarity
    console.log("\n3. Testing Direct Cosine Similarity Search...");
    const sessionId = 'test-semantic-session';
    await vectorSearchProvider.deleteSession(sessionId); // Clean old records

    const docText1 = "The patient has asthma symptoms and uses an albuterol inhaler.";
    const docText2 = "Cardiac evaluation indicates normal sinus rhythm and no murmurs.";
    
    const vec1 = await memoryEmbeddingManager.generate(docText1);
    const vec2 = await memoryEmbeddingManager.generate(docText2);
    
    await vectorSearchProvider.insert("doc_1", sessionId, docText1, vec1, { category: "respiratory" });
    await vectorSearchProvider.insert("doc_2", sessionId, docText2, vec2, { category: "cardiology" });
    
    const queryVec = await memoryEmbeddingManager.generate("inhaler and breathing");
    const results = await vectorSearchProvider.query(sessionId, queryVec, 1);
    
    assert(results.length === 1, "Returned 1 nearest neighbor");
    assert(results[0].document.id === "doc_1", "Closest vector matches respiratory record");
    assert(results[0].similarity > 0.0, "Cosine similarity score is positive");

    // 4. Test Background Event Chunk-Indexing
    console.log("\n4. Testing Event-Driven Markdown Indexing...");
    await memoryManager.deleteSession(sessionId, 'system').catch(() => {});
    await memoryManager.createSession(sessionId, ['test', 'semantic'], 'agent');

    const markdownState = `
# Medical Workspace
Some generic introduction paragraph.

## Active Pathology
- The patient exhibits pulmonary fibrosis signs.
- Prescribed Pirfenidone treatment.

## Patient History
- Family history of heart disease.
`;
    // Update working memory - this emits 'workingMemory.updated' event
    await memoryGateway.updateWorkingMemory(sessionId, markdownState, undefined, 'agent');

    // Wait for the asynchronous EventBus + EmbeddingHandler to generate vectors and index them
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify vector database has indexed the chunks
    const dbPath = path.resolve(path.dirname(workspaceManager.getWorkspacePath()), 'memory/embeddings/vectors.json');
    assert(existsSync(dbPath), "vectors.json database file created");

    // 5. Test Hybrid Search API
    console.log("\n5. Testing Hybrid Search Retrieval...");
    const searchResults = await memorySearchManager.search(sessionId, "pulmonary fibrosis", 2);
    
    assert(searchResults.length >= 1, "Search retrieved match");
    assert(searchResults[0].text.includes("pulmonary fibrosis"), "Search retrieved correct chunk text content");
    assert(searchResults[0].score > 0.5, "Score reflects hybrid similarity weight");

    // Cleanup
    await memoryManager.deleteSession(sessionId, 'system');
    await memoryManager.shutdown();

  } catch (err: any) {
    assert(false, `Semantic Validation threw unexpected error: ${err.message}\n${err.stack}`);
  }

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Memory Semantic Search validation completed successfully!");
    process.exit(0);
  }
}

runValidation().catch(e => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
