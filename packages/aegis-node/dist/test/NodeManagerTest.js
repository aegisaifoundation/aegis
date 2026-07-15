import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { NodeManager } from '../NodeManager/NodeManager.js';
import { NodeAPI } from '../APIs/NodeAPI.js';
describe('NodeManager Platform Tests', () => {
    const testWorkspace = path.resolve(process.cwd(), '.test-aegis');
    before(() => {
        // Cleanup any legacy test workspaces
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });
    after(() => {
        // Final cleanup
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });
    test('Workspace initialization and directories provisioning', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        // Check directory layout exists
        const expectedDirs = [
            'identity',
            'config',
            'cache',
            'logs',
            'installed',
            'federation',
            'trust',
            'workspace',
            'packages'
        ];
        for (const subdir of expectedDirs) {
            assert.ok(fs.existsSync(path.join(testWorkspace, subdir)), `Subdirectory '${subdir}' should be created`);
        }
    });
    test('Node Identity credentials generation and cryptographic state persistence', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        const identity = manager.getIdentity();
        assert.ok(identity);
        assert.ok(identity.nodeId.startsWith('aegis://'), 'nodeId must start with aegis:// schema');
        assert.strictEqual(identity.name, 'Research Laptop');
        assert.strictEqual(identity.edition, 'Student');
        assert.strictEqual(identity.role, 'Developer');
        // Check PEM files and fingerprint
        assert.ok(identity.privateKey.includes('-----BEGIN PRIVATE KEY-----'), 'Private key file should be written');
        assert.ok(identity.publicKey.includes('-----BEGIN PUBLIC KEY-----'), 'Public key file should be written');
        assert.ok(identity.certificate.includes('-----BEGIN CERTIFICATE-----'), 'Certificate file should be written');
        assert.strictEqual(identity.fingerprint.length, 64, 'Fingerprint must be SHA256 hex string');
    });
    test('Node Configuration loading and policy updates', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        const config = manager.getConfig();
        assert.strictEqual(config.nodeName, 'Research Laptop');
        assert.strictEqual(config.role, 'Developer');
        assert.strictEqual(config.edition, 'Student');
        assert.ok(config.policies.allowDiscovery);
        // Update policies
        manager.getConfigManager().update({
            policies: {
                allowDiscovery: false,
                minTrustLevel: 0.95
            }
        });
        const updated = manager.getConfig();
        assert.strictEqual(updated.policies.allowDiscovery, false, 'Policy should be updated to false');
        assert.strictEqual(updated.policies.minTrustLevel, 0.95, 'Policy minTrustLevel should be updated');
    });
    test('Trust Store entry addition and removal', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        const trustMgr = manager.getTrustManager();
        const mockPeerId = 'aegis://peer-test-node-123';
        const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCKKEY...\n-----END PUBLIC KEY-----';
        // Add trusted node
        trustMgr.addTrustedNode({
            nodeId: mockPeerId,
            publicKey: mockPublicKey,
            trustLevel: 0.9,
            alias: 'Lab Server'
        });
        assert.ok(trustMgr.isNodeTrusted(mockPeerId, 0.8), 'Peer should be trusted at 0.8 required level');
        assert.ok(!trustMgr.isNodeTrusted(mockPeerId, 0.95), 'Peer should not be trusted at 0.95 required level');
        const list = trustMgr.getTrustedNodes();
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].nodeId, mockPeerId);
        assert.strictEqual(list[0].alias, 'Lab Server');
        // Remove trusted node
        trustMgr.removeTrustedNode(mockPeerId);
        assert.ok(!trustMgr.isNodeTrusted(mockPeerId), 'Peer should no longer be trusted after removal');
        assert.strictEqual(trustMgr.getTrustedNodes().length, 0);
    });
    test('Federation Metadata state management', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        const fedMgr = manager.getFederationManager();
        const initial = fedMgr.getMetadata();
        assert.strictEqual(initial.enabled, false);
        // Join cluster
        fedMgr.joinCluster('cluster-omega');
        const joined = fedMgr.getMetadata();
        assert.strictEqual(joined.joined, true);
        assert.deepStrictEqual(joined.clusters, ['cluster-omega']);
        // Leave cluster
        fedMgr.leaveCluster('cluster-omega');
        const left = fedMgr.getMetadata();
        assert.strictEqual(left.joined, false);
        assert.strictEqual(left.clusters.length, 0);
    });
    test('High-Level Node API Orchestration wrapper', () => {
        const manager = new NodeManager(testWorkspace);
        manager.initialize('Research Laptop', 'Student', 'Developer');
        const api = new NodeAPI(manager);
        const info = api.GetNodeInfo();
        assert.ok(info.nodeId.startsWith('aegis://'));
        assert.strictEqual(info.name, 'Research Laptop');
        assert.strictEqual(api.RuntimeStatus(), 'INACTIVE', 'Runtime should be inactive by default');
        const caps = api.ListCapabilities();
        assert.ok(Array.isArray(caps));
        assert.ok(caps.length > 0);
        assert.strictEqual(caps[0].type, 'Engine');
    });
});
//# sourceMappingURL=NodeManagerTest.js.map