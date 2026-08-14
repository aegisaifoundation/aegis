import { Bootloader } from '@aegis/runtime';
import { serviceRegistry } from '@aegis/runtime';
import { runtimeSessionManager } from '@aegis/runtime/dist/services/RuntimeSessionManager.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const cwd = process.cwd();
  const docPath = path.join(cwd, 'docs', 'aegis_overlay_network.md');

  if (!fs.existsSync(docPath)) {
    console.error(`Error: Documentation file not found at ${docPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(docPath, 'utf8');
  console.log(`[Indexer] Loaded doc file. Length: ${fileContent.length} characters.`);

  // 1. Boot the platform microkernel
  console.log('[Indexer] Booting AEGIS Core Platform...');
  const kernel = await Bootloader.boot();

  try {
    // 2. Resolve embedding and vector search providers
    const embeddingManager = serviceRegistry.get<any>('memoryEmbeddingManager');
    const searchProvider = serviceRegistry.get<any>('MemoryIndexManager'); // Resolve vectorSearchProvider directly
    const { vectorSearchProvider } = await import('@aegis/memory/dist/search/VectorSearchProvider.js');

    // 3. Resolve target session IDs
    const sessions = await runtimeSessionManager.listSessions();
    const sessionIds = sessions.map(s => s.sessionId);
    if (sessionIds.length === 0) {
      sessionIds.push('default');
    }
    console.log(`[Indexer] Target Session IDs for indexing:`, sessionIds);

    // 4. Chunk the document (split by double newlines/paragraphs)
    const rawChunks = fileContent.split(/\n\n+/);
    const cleanChunks = rawChunks
      .map(c => c.trim())
      .filter(c => c.length > 20); // skip very short lines/headers

    console.log(`[Indexer] Split document into ${cleanChunks.length} semantic chunks.`);

    // 5. Index chunks into vector databases
    for (let i = 0; i < cleanChunks.length; i++) {
      const chunk = cleanChunks[i]!;
      console.log(`[Indexer] Generating embedding vector for chunk ${i + 1}/${cleanChunks.length}...`);
      
      const vector = await embeddingManager.generate(chunk);
      const chunkId = `doc-aon-chunk-${i}`;

      for (const sessionId of sessionIds) {
        await vectorSearchProvider.insert(chunkId, sessionId, chunk, vector, {
          sourceDoc: 'aegis_overlay_network.md',
          chunkIndex: i,
          title: 'AEGIS Overlay Network (AON)'
        });
      }
    }

    console.log(`[Indexer] Successfully converted and indexed AON documentation into vector embeddings for session(s).`);

  } finally {
    // 6. Shutdown the platform microkernel
    console.log('[Indexer] Shutting down AEGIS Core Platform...');
    await kernel.shutdown();
    console.log('[Indexer] Shutdown completed.');
  }
}

main().catch((err) => {
  console.error('[Indexer] Execution failed:', err);
  process.exit(1);
});
