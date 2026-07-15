/**
 * Unit Tests — LearningManager
 * Tests state machine transitions, strategy hot-swap, pause/resume, stopRound.
 */
import { LearningManager } from '../../manager/LearningManager.js';
import { RoundManager } from '../../manager/RoundManager.js';
import { AggregationManager } from '../../manager/AggregationManager.js';
import { LearningCheckpointManager } from '../../manager/LearningCheckpointManager.js';
import { LearningVersionManager } from '../../manager/LearningVersionManager.js';
import { LoRAManager } from '../../model/LoRAManager.js';
import { PrivacyManager } from '../../privacy/PrivacyManager.js';
import { LearningPolicies } from '../../policy/LearningPolicies.js';
import { FederatedLearningStrategy } from '../../strategy/FederatedLearningStrategy.js';
import { SwarmLearningStrategy } from '../../strategy/SwarmLearningStrategy.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ── Test Harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✘ FAIL: ${message}`);
    failed++;
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n[Test] ${name}`);
  try {
    await fn();
  } catch (e: any) {
    console.error(`  ✘ EXCEPTION: ${e.message}`);
    failed++;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildManager(workspacePath: string): LearningManager {
  const policies = new LearningPolicies();
  policies.roundTimeoutMs = 5000;
  policies.requireTrustVerification = false;

  const roundManager = new RoundManager();
  const aggManager   = new AggregationManager();
  const cpManager    = new LearningCheckpointManager(workspacePath);
  const verManager   = new LearningVersionManager();
  const loraManager  = new LoRAManager(workspacePath);
  const privManager  = new PrivacyManager();

  return new LearningManager(roundManager, aggManager, cpManager, verManager, loraManager, privManager, policies);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const tmpDir = path.join(os.tmpdir(), `aegis-lm-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

console.log('═══════════════════════════════════════════════════════');
console.log('TEST: LearningManager Unit Tests');
console.log('═══════════════════════════════════════════════════════');

await test('Initial state is IDLE', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');
  assert(mgr.getState() === 'IDLE', 'State is IDLE');
});

await test('Throws if unknown strategy requested', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');
  let threw = false;
  try {
    await mgr.startRound('nonexistent-strategy');
  } catch {
    threw = true;
  }
  assert(threw, 'Throws on unknown strategy');
});

await test('Full federated round completes (standalone)', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');

  const federated = new FederatedLearningStrategy();
  await federated.initialize({
    localNodeId: 'test-node',
    dis: null,
    aggregationManager: new AggregationManager(),
    loraManager: new LoRAManager(tmpDir),
    privacyManager: new PrivacyManager(),
    checkpointManager: new LearningCheckpointManager(tmpDir),
    versionManager: new LearningVersionManager()
  });
  mgr.registerStrategy(federated);

  const round = await mgr.startRound('federated');
  assert(round !== null, 'Round object returned');
  assert(round.roundNumber === 1, 'Round number is 1');
  assert(mgr.getState() === 'IDLE', 'State returns to IDLE after completion');
  assert(mgr.getRoundHistory().length === 1, 'History contains 1 completed round');
});

await test('Pause and resume transitions correctly', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');

  await mgr.pauseLearning();
  assert(mgr.getState() === 'PAUSED', 'State is PAUSED after pauseLearning');

  await mgr.resumeLearning();
  assert(mgr.getState() === 'IDLE', 'State is IDLE after resumeLearning');
});

await test('Strategy hot-swap without active round', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');

  const federated = new FederatedLearningStrategy();
  const swarm     = new SwarmLearningStrategy();

  const ctx = {
    localNodeId: 'test-node', dis: null,
    aggregationManager: new AggregationManager(),
    loraManager: new LoRAManager(tmpDir),
    privacyManager: new PrivacyManager(),
    checkpointManager: new LearningCheckpointManager(tmpDir),
    versionManager: new LearningVersionManager()
  };
  await federated.initialize(ctx);
  await swarm.initialize(ctx);

  mgr.registerStrategy(federated);
  mgr.registerStrategy(swarm);

  await mgr.switchStrategy('swarm');
  assert(mgr.getActiveStrategyName() === 'swarm', 'Active strategy is swarm');

  await mgr.switchStrategy('federated');
  assert(mgr.getActiveStrategyName() === 'federated', 'Active strategy switched back to federated');
});

await test('getRegisteredStrategies lists all registered', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');
  mgr.registerStrategy(new FederatedLearningStrategy());
  mgr.registerStrategy(new SwarmLearningStrategy());
  const strats = mgr.getRegisteredStrategies();
  assert(strats.includes('federated'), 'Contains federated');
  assert(strats.includes('swarm'), 'Contains swarm');
});

await test('Shutdown cleans up', async () => {
  const mgr = buildManager(tmpDir);
  mgr.initialize(null, 'test-node');
  await mgr.shutdown();
  assert(mgr.getState() === 'SHUTDOWN', 'State is SHUTDOWN');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`LearningManager Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
