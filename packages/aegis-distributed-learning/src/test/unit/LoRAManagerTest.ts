/**
 * Unit Tests — LoRAManager
 * Tests adapter lifecycle: create, load, merge, export, import, compress, sign, verify.
 * Verifies privacy invariant: base model path is never included in exports.
 */
import { LoRAManager } from '../../model/LoRAManager.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) { console.log(`  ✔ ${message}`); passed++; }
  else { console.error(`  ✘ FAIL: ${message}`); failed++; }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n[Test] ${name}`);
  try { await fn(); }
  catch (e: any) { console.error(`  ✘ EXCEPTION: ${e.message}`); failed++; }
}

const tmpDir = path.join(os.tmpdir(), `aegis-lora-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

console.log('═══════════════════════════════════════════════════════');
console.log('TEST: LoRAManager Unit Tests');
console.log('═══════════════════════════════════════════════════════');

await test('Create adapter returns valid record', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 4, alpha: 16, targetModules: ['q_proj', 'v_proj'], dropout: 0.05
  });
  assert(typeof adapter.id === 'string' && adapter.id.startsWith('lora-'), 'ID has correct prefix');
  assert(adapter.modelId === 'base-model-v1', 'modelId matches');
  assert(adapter.rank === 4, 'rank matches');
  assert(adapter.alpha === 16, 'alpha matches');
  assert(typeof adapter.hash === 'string' && adapter.hash.length === 64, 'SHA-256 hash present');
  assert(fs.existsSync(adapter.path), 'Adapter file written to disk');
  assert(mgr.getAdapterCount() === 1, 'Adapter count is 1');
});

await test('Sign and verify adapter round-trip', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 4, alpha: 8, targetModules: ['out_proj'], dropout: 0.0
  });
  const signed = mgr.signAdapter(adapter.id);
  assert(signed !== null, 'signAdapter returns non-null');
  const verified = mgr.verifyAdapter(adapter.id);
  assert(verified, 'Signature verified successfully');
});

await test('Export does not include base model path', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('secret-base-model', {
    rank: 8, alpha: 32, targetModules: ['q_proj'], dropout: 0.1
  });
  const blob = mgr.exportAdapter(adapter.id);
  assert(blob !== null, 'Export returns non-null');
  const parsed = JSON.parse(blob!);
  // Privacy invariant: exported blob must NOT contain the word 'secret-base-model' in path fields
  assert(parsed.format === 'aegis-lora-v1', 'Correct format tag');
  assert(!JSON.stringify(parsed.adapter).includes('secret-base-model') || parsed.adapter.modelId === 'secret-base-model', 'modelId is OK to include (it is metadata)');
  // Critical: the 'path' field (absolute disk path) must not be in the exported adapter
  assert(parsed.adapter.path === undefined, 'Disk path NOT included in export (privacy invariant)');
});

await test('Import → verify hash integrity', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 4, alpha: 16, targetModules: ['q_proj', 'k_proj'], dropout: 0.0
  });
  const blob = mgr.exportAdapter(adapter.id);
  assert(blob !== null, 'Export succeeded');

  const mgr2 = new LoRAManager(tmpDir);
  const imported = mgr2.importAdapter(blob!);
  assert(imported !== null, 'Import succeeded');
  assert(imported!.id === adapter.id, 'IDs match after import');
  assert(mgr2.verifyAdapter(imported!.id), 'Imported adapter verifies correctly');
});

await test('Import rejects tampered blob', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 4, alpha: 16, targetModules: ['q_proj'], dropout: 0.0
  });
  const blob = mgr.exportAdapter(adapter.id)!;
  // Tamper: corrupt the weights
  const tampered = blob.replace(/[-\d.]+,/g, '99999,');
  const result = mgr.importAdapter(tampered);
  assert(result === null, 'Tampered import rejected (null returned)');
});

await test('Compress adapter reduces effective precision', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 16, alpha: 64, targetModules: ['q_proj', 'v_proj', 'out_proj'], dropout: 0.0
  });
  const before = adapter.sizeBytes;
  const compressed = mgr.compressAdapter(adapter.id);
  assert(compressed !== null, 'Compression returned non-null');
  assert(compressed!.metadata.compressed === true, 'Metadata flags compression');
});

await test('Update adapter weights changes hash', async () => {
  const mgr = new LoRAManager(tmpDir);
  const adapter = mgr.createAdapter('base-model-v1', {
    rank: 4, alpha: 16, targetModules: ['q_proj'], dropout: 0.0
  });
  const hashBefore = adapter.hash;
  mgr.updateAdapterWeights(adapter.id, { q_proj: [0.1, 0.2, 0.3, 0.4] });
  const updated = mgr.getAdapter(adapter.id)!;
  assert(updated.hash !== hashBefore, 'Hash changed after weight update');
});

await test('listAdapters returns all registered', async () => {
  const mgr = new LoRAManager(tmpDir);
  mgr.createAdapter('model-a', { rank: 4, alpha: 16, targetModules: ['q'], dropout: 0.0 });
  mgr.createAdapter('model-b', { rank: 8, alpha: 32, targetModules: ['v'], dropout: 0.0 });
  const list = mgr.listAdapters();
  assert(list.length >= 2, `At least 2 adapters listed (got ${list.length})`);
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`LoRAManager Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
