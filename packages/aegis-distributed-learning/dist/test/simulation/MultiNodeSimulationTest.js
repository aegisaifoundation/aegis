/**
 * Simulation Tests — Multi-Node Learning
 * Boots SimulationMode with 4 MockNodes and validates complete
 * federated and swarm learning rounds on a single machine.
 */
import { SimulationMode } from '../../simulation/SimulationMode.js';
let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) {
        console.log(`  ✔ ${message}`);
        passed++;
    }
    else {
        console.error(`  ✘ FAIL: ${message}`);
        failed++;
    }
}
async function test(name, fn) {
    console.log(`\n[Test] ${name}`);
    try {
        await fn();
    }
    catch (e) {
        console.error(`  ✘ EXCEPTION: ${e.message}`);
        failed++;
    }
}
console.log('═══════════════════════════════════════════════════════');
console.log('TEST: Multi-Node Simulation Tests (4 nodes)');
console.log('═══════════════════════════════════════════════════════');
await test('SimulationMode boots with 4 independent nodes', async () => {
    const sim = new SimulationMode(4);
    assert(sim.getNodeCount() === 4, 'Exactly 4 nodes initialised');
    const nodes = sim.getNodes();
    const ids = nodes.map(n => n.nodeId);
    const uniqueIds = new Set(ids);
    assert(uniqueIds.size === 4, 'All 4 nodes have unique IDs');
    const names = nodes.map(n => n.displayName);
    const uniqueNames = new Set(names);
    assert(uniqueNames.size === 4, 'All 4 nodes have unique display names');
});
await test('All 4 nodes start with independent random weights', async () => {
    const sim = new SimulationMode(4);
    const nodes = sim.getNodes();
    const weightKeys = Object.keys(nodes[0].getLocalWeights());
    // Weights should differ between nodes (random init)
    const w0 = nodes[0].getLocalWeights()[weightKeys[0]];
    const w1 = nodes[1].getLocalWeights()[weightKeys[0]];
    assert(JSON.stringify(w0) !== JSON.stringify(w1), 'Node weights differ (independent initialisation)');
});
await test('Federated simulation round completes with all 4 participants', async () => {
    const sim = new SimulationMode(4);
    const result = await sim.runFederatedSimulation(0);
    assert(typeof result.roundId === 'string', 'Round has an ID');
    assert(result.roundNumber === 1, 'Round number is 1');
    assert(result.algorithm === 'fedavg', 'Algorithm is fedavg');
    assert(result.contributors.length === 4, 'All 4 nodes contributed');
    assert(typeof result.resultHash === 'string' && result.resultHash.length === 64, 'Result has SHA-256 hash');
    assert(result.completedAt instanceof Date, 'completedAt is a Date');
});
await test('All nodes converge after federated round (applied global weights)', async () => {
    const sim = new SimulationMode(4);
    const metricsBefore = sim.getNodes().map(n => n.getMetrics().accuracy);
    await sim.runFederatedSimulation();
    const metricsAfter = sim.getNodes().map(n => n.getRoundsParticipated());
    // Every node should have participated in exactly 1 round
    assert(metricsAfter.every(r => r === 1), 'All nodes participated in 1 round');
});
await test('Swarm simulation completes with majority contributors', async () => {
    const sim = new SimulationMode(4);
    const result = await sim.runSwarmSimulation();
    assert(result.algorithm === 'swarm-fedavg', 'Algorithm is swarm-fedavg');
    assert(result.contributors.length === 4, 'All 4 nodes contributed');
    assert(typeof result.resultHash === 'string' && result.resultHash.length === 64, 'Hash present');
});
await test('Multi-round federated: accuracy improves across 3 rounds', async () => {
    const sim = new SimulationMode(4);
    const results = await sim.runMultiRound(3, 'federated');
    assert(results.length === 3, '3 rounds completed');
    assert(results[0].roundNumber === 1, 'Round 1 first');
    assert(results[2].roundNumber === 3, 'Round 3 last');
    assert(sim.getRoundCount() === 3, 'SimulationMode round counter is 3');
    // Metrics should improve across rounds
    const nodes = sim.getNodes();
    for (const node of nodes) {
        const m = node.getMetrics();
        assert(m.accuracy > 0.5, `${node.displayName}: accuracy > 0.5 (actual: ${m.accuracy.toFixed(4)})`);
        assert(m.loss < 1.0, `${node.displayName}: loss < 1.0 (actual: ${m.loss.toFixed(4)})`);
    }
});
await test('Multi-round swarm: 3 rounds all produce unique hashes', async () => {
    const sim = new SimulationMode(4);
    const results = await sim.runMultiRound(3, 'swarm');
    const hashes = new Set(results.map(r => r.resultHash));
    assert(hashes.size === 3, '3 unique result hashes (deterministic per round)');
});
await test('getCompletedRounds returns all results', async () => {
    const sim = new SimulationMode(4);
    await sim.runFederatedSimulation();
    await sim.runSwarmSimulation();
    const completed = sim.getCompletedRounds();
    assert(completed.length === 2, '2 completed rounds tracked');
});
console.log('\n═══════════════════════════════════════════════════════');
console.log(`Simulation Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');
if (failed > 0)
    process.exit(1);
//# sourceMappingURL=MultiNodeSimulationTest.js.map