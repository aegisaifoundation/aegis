/**
 * Unit Tests — RoundManager
 * Tests round creation, deadline, participant join/leave, state machine, and timeout watchdog.
 */
import { RoundManager } from '../../manager/RoundManager.js';

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

console.log('═══════════════════════════════════════════════════════');
console.log('TEST: RoundManager Unit Tests');
console.log('═══════════════════════════════════════════════════════');

await test('createRound returns correct initial state', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);
  assert(round.status === 'PENDING', 'Initial status is PENDING');
  assert(round.leaderId === 'node-a', 'Leader is initiating node');
  assert(round.participants.includes('node-a'), 'Initiator is in participants');
  assert(round.roundNumber === 1, 'First round number is 1');
  assert(round.strategyName === 'federated', 'Strategy name stored');
  mgr.shutdown();
});

await test('Full PENDING → COLLECTING → AGGREGATING → COMPLETE transition', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);

  mgr.startCollection(round.roundId);
  assert(mgr.getRound(round.roundId)!.status === 'COLLECTING', 'Status is COLLECTING');

  mgr.startAggregation(round.roundId);
  assert(mgr.getRound(round.roundId)!.status === 'AGGREGATING', 'Status is AGGREGATING');

  mgr.completeRound(round.roundId);
  assert(mgr.getRound(round.roundId)!.status === 'COMPLETE', 'Status is COMPLETE');
  assert(mgr.getHistory().length === 1, 'History contains 1 completed round');
  mgr.shutdown();
});

await test('failRound transitions to FAILED', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'swarm', 10_000);
  mgr.failRound(round.roundId, 'test_failure');
  assert(mgr.getRound(round.roundId)!.status === 'FAILED', 'Status is FAILED');
  mgr.shutdown();
});

await test('joinRound adds participant to PENDING round', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);
  const joined = mgr.joinRound(round.roundId, 'node-b');
  assert(joined, 'joinRound returns true');
  assert(mgr.getRound(round.roundId)!.participants.includes('node-b'), 'node-b is in participants');
  assert(mgr.getRound(round.roundId)!.participants.length === 2, '2 total participants');
  mgr.shutdown();
});

await test('joinRound prevents duplicate participant', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);
  mgr.joinRound(round.roundId, 'node-b');
  mgr.joinRound(round.roundId, 'node-b'); // Duplicate
  assert(mgr.getRound(round.roundId)!.participants.filter(p => p === 'node-b').length === 1, 'No duplicate participants');
  mgr.shutdown();
});

await test('leaveRound removes participant', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);
  mgr.joinRound(round.roundId, 'node-b');
  mgr.leaveRound(round.roundId, 'node-b');
  assert(!mgr.getRound(round.roundId)!.participants.includes('node-b'), 'node-b removed from participants');
  mgr.shutdown();
});

await test('joinRound fails on COMPLETE round', async () => {
  const mgr = new RoundManager();
  const round = mgr.createRound('node-a', 'federated', 10_000);
  mgr.completeRound(round.roundId);
  const joined = mgr.joinRound(round.roundId, 'node-b');
  assert(!joined, 'Cannot join a completed round');
  mgr.shutdown();
});

await test('Timeout watchdog fires after deadline', async () => {
  const mgr = new RoundManager();
  let timedOut = false;
  mgr.onTimeout = () => { timedOut = true; };

  mgr.createRound('node-a', 'federated', 50); // 50ms timeout
  await new Promise(r => setTimeout(r, 150));
  assert(timedOut, 'Timeout callback fired within 150ms');
  mgr.shutdown();
});

await test('getActiveRound returns null when no round active', async () => {
  const mgr = new RoundManager();
  assert(mgr.getActiveRound() === undefined, 'getActiveRound is undefined initially');
  mgr.shutdown();
});

await test('Round number increments correctly', async () => {
  const mgr = new RoundManager();
  mgr.createRound('node-a', 'federated', 10_000);
  mgr.createRound('node-a', 'swarm', 10_000);
  mgr.createRound('node-a', 'federated', 10_000);
  assert(mgr.getRoundCount() === 3, 'Round count is 3');
  mgr.shutdown();
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`RoundManager Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
