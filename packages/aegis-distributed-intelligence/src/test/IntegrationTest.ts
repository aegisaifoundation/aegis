import path from 'path';
import { fileURLToPath } from 'url';
import { DistributedIntelligenceEngine } from '../adapter/DistributedIntelligenceEngine.js';

// ============================================================
// Integration Test — DistributedIntelligenceEngine Process Adapter
//
// Verifies:
//  1. Engine initializes without error
//  2. Engine starts — process launches and AEGIS_DIE_READY is received
//  3. Health returns HEALTHY while process is alive
//  4. Shutdown — process receives SHUTDOWN / SIGTERM and exits cleanly
//  5. Health returns UNHEALTHY after shutdown
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✘ FAILED: ${message}`);
    failed++;
  }
}

const mockContext: any = {
  runtimeId: 'test-runtime',
  kernelVersion: '1.0.0',
  bootId: 'test-boot',
  platform: 'win32',
  architecture: 'x64',
  bootMode: 'NORMAL',
  getWorkspacePath: () => path.resolve(__dirname, '../../../..', 'workspace'),
  getLogger: () => ({
    info:  (msg: string, src: string) => console.log(`    [${src}] ${msg}`),
    warn:  (msg: string, src: string) => console.warn(`    [${src}] WARN: ${msg}`),
    error: (msg: string, src: string) => console.error(`    [${src}] ERROR: ${msg}`),
  }),
  getConfig:   () => ({}),
  getSecrets:  () => ({}),
  getService:  (_: string) => undefined,
  getEventBus: () => ({
    on: () => {},
    off: () => {},
    emit: (ev: string, payload: any) => console.log(`    [EventBus] ${ev}:`, JSON.stringify(payload)),
  }),
};

async function runTests(): Promise<void> {
  console.log('\n=== AEGIS Distributed Intelligence Engine — Integration Test ===\n');

  const engine = new DistributedIntelligenceEngine();

  // Test 1: Metadata
  console.log('[Test 1] Verify engine metadata...');
  assert(engine.metadata.id === 'distributed-intelligence', 'Engine ID is "distributed-intelligence"');
  assert(engine.metadata.autoStart === true, 'autoStart is true');
  assert(engine.metadata.singleton === true, 'singleton is true');

  // Test 2: Initialize
  console.log('\n[Test 2] Initialize engine...');
  await engine.initialize(mockContext);
  assert(engine.getState() === 'REGISTERED', 'State is REGISTERED after initialize');

  // Test 3: Start
  console.log('\n[Test 3] Start engine (launches die-service.exe)...');
  try {
    await engine.start();
    assert(engine.getState() === 'ONLINE', 'State is ONLINE after start');
    assert(engine.getPid() !== undefined, `Process PID is assigned (${engine.getPid()})`);
  } catch (err: any) {
    console.error(`  ✘ Engine failed to start: ${err.message}`);
    failed++;
    console.log('\n⚠ Skipping health and shutdown tests (engine did not start).');
    printSummary();
    return;
  }

  // Test 4: Health while running
  console.log('\n[Test 4] Health check while engine is ONLINE...');
  const healthOnline = await engine.health();
  assert(healthOnline.status === 'HEALTHY', `Health is HEALTHY (latency: ${healthOnline.latencyMs}ms)`);
  assert((healthOnline.details as any)?.pid === engine.getPid(), 'Health report contains correct PID');

  // Test 5: Uptime
  console.log('\n[Test 5] Uptime tracking...');
  assert(engine.getUptimeMs() > 0, `Uptime is positive (${engine.getUptimeMs()}ms)`);
  assert(engine.getStartedAt() !== null, 'startedAt is recorded');

  // Test 6: Shutdown
  console.log('\n[Test 6] Graceful shutdown...');
  await engine.shutdown();
  assert(engine.getState() === 'STOPPED', 'State is STOPPED after shutdown');
  assert(engine.getPid() === undefined, 'PID is cleared after shutdown');

  // Test 7: Health after shutdown
  console.log('\n[Test 7] Health check after shutdown...');
  const healthStopped = await engine.health();
  assert(healthStopped.status === 'UNHEALTHY', `Health is UNHEALTHY after shutdown (state: ${engine.getState()})`);

  printSummary();
}

function printSummary(): void {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed.`);
  console.log('═'.repeat(55));
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('\n❌ Integration test suite crashed:', err);
  process.exit(1);
});
