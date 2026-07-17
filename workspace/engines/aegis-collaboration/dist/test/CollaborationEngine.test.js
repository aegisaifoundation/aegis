import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CollaborationEngine } from '../CollaborationEngine.js';
import { SimulationManager } from '../simulation/SimulationManager.js';
import os from 'os';
import path from 'path';
describe('AEGIS Collaboration Engine Tests', () => {
    const tmpDir = path.join(os.tmpdir(), `aegis-collaboration-test-${Date.now()}`);
    test('Metadata validation', () => {
        const engine = new CollaborationEngine();
        assert.strictEqual(engine.metadata.id, 'aegis-collaboration');
        assert.strictEqual(engine.metadata.singleton, true);
    });
    test('Session and Sandbox management', async () => {
        const engine = new CollaborationEngine();
        const mockCtx = {
            getWorkspacePath: () => tmpDir,
            runtimeId: 'node-main'
        };
        await engine.initialize(mockCtx);
        const session = engine.CreateCollaboration('Workflow Collaboration', ['node-main', 'node-peer']);
        assert.strictEqual(session.name, 'Workflow Collaboration');
        assert.strictEqual(engine.CollaborationStatus(session.sessionId), 'active');
        // Join
        const joined = engine.JoinCollaboration(session.sessionId, 'node-peer');
        assert.ok(joined);
        // Sandbox check
        assert.ok(engine.getSessionManager().isAuthorized(session.sessionId, 'node-main'));
        assert.ok(engine.getSessionManager().isAuthorized(session.sessionId, 'node-peer'));
        // Leave
        engine.LeaveCollaboration(session.sessionId);
        engine.getSessionManager().closeSandbox(session.sessionId);
        assert.strictEqual(engine.getSessionManager().getAllocation(session.sessionId, 'node-main'), undefined);
    });
    test('Policy Manager verification', () => {
        const engine = new CollaborationEngine();
        const mockCtx = {
            getWorkspacePath: () => tmpDir,
            runtimeId: 'node-main'
        };
        engine.initialize(mockCtx);
        const pm = engine.getPolicyManager();
        // Default policy is personal
        assert.strictEqual(pm.getPolicy().policyType, 'personal');
        assert.ok(pm.canShareCategory('experience_package'));
        assert.ok(!pm.canShareCategory('knowledge_package')); // Personal policy denies knowledge packages by default
        // Medical policy
        pm.setPolicy('medical');
        assert.ok(pm.canShareCategory('knowledge_package'));
        assert.ok(pm.canCollaborateWith('trusted-node', 0.95));
        assert.ok(!pm.canCollaborateWith('untrusted-node', 0.5)); // Trust threshold is 0.9 for Medical
    });
    test('Consensus Manager tallies', () => {
        const engine = new CollaborationEngine();
        const mockCtx = {
            getWorkspacePath: () => tmpDir,
            runtimeId: 'node-main'
        };
        engine.initialize(mockCtx);
        const votes = [
            { nodeId: 'node-1', approve: true, confidence: 0.9 },
            { nodeId: 'node-2', approve: true, confidence: 0.8 },
            { nodeId: 'node-3', approve: false, confidence: 0.95 }
        ];
        // Majority vote consensus (2 yes, 1 no)
        const majOutcome = engine.VoteConsensus(votes, 'majority');
        assert.ok(majOutcome.approved);
        assert.strictEqual(majOutcome.consensusScore, 2 / 3);
        // Weighted trust vote consensus
        const trustWeights = { 'node-1': 1.0, 'node-2': 0.5, 'node-3': 2.0 };
        // yes: (0.9 * 1.0) + (0.8 * 0.5) = 1.3
        // no: (0.95 * 2.0) = 1.9
        // total = 3.2
        // score = 1.3 / 3.2 = 0.40625 (< 0.5)
        const weightedOutcome = engine.VoteConsensus(votes, 'weighted_trust', trustWeights);
        assert.ok(!weightedOutcome.approved);
    });
    test('Exchange Manager and Packaging', async () => {
        const engine = new CollaborationEngine();
        const mockCtx = {
            getWorkspacePath: () => tmpDir,
            runtimeId: 'node-main'
        };
        engine.initialize(mockCtx);
        // Request Tool
        const result = await engine.RequestTool('Clinical_OCR', 'node-peer');
        assert.ok(result);
        assert.ok(engine.getExchangeManager().hasInstalled('Clinical_OCR'));
    });
    test('End-to-End ASCIP Simulation Demo', async () => {
        const sim = new SimulationManager();
        const result = await sim.runEndToEndDemo();
        assert.strictEqual(result.sessionName, 'Clinical Analysis Collaboration');
        assert.ok(result.toolExchanged);
        assert.ok(result.knowledgeExchanged);
        assert.ok(result.reasoningCollected);
        assert.ok(result.consensusApproved);
        assert.ok(result.trustScoreNodeB > 0.8);
    });
});
