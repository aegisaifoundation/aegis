import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AonEngine } from '../network/AonEngine.js';
import { CollaborationEngine } from '../CollaborationEngine.js';
describe('AEGIS Overlay Network (AON) Tests', () => {
    test('Public IP address resolution via STUN', async () => {
        const aon = new AonEngine();
        const addr = await aon.resolvePublicAddress();
        assert.strictEqual(addr.ip, '198.51.100.42');
        assert.strictEqual(addr.port, 9900);
    });
    test('Key Exchange and Symmetric Tunnels', () => {
        const aonA = new AonEngine();
        const aonB = new AonEngine();
        const pubA = aonA.getPublicKeyHex();
        const pubB = aonB.getPublicKeyHex();
        // Derive secrets
        const secretA = aonA.deriveSharedSecret(pubB);
        const secretB = aonB.deriveSharedSecret(pubA);
        // Assert key exchange symmetry (Diffie-Hellman)
        assert.deepStrictEqual(secretA, secretB);
        // Establish tunnel
        const tunnel = aonA.establishTunnel('tun-123', '198.51.100.99:9900', secretA);
        assert.strictEqual(tunnel.status, 'ACTIVE');
        assert.strictEqual(aonA.listTunnels().length, 1);
    });
    test('AES-256-GCM message encryption/decryption', () => {
        const aonA = new AonEngine();
        const aonB = new AonEngine();
        const pubA = aonA.getPublicKeyHex();
        const pubB = aonB.getPublicKeyHex();
        const secretA = aonA.deriveSharedSecret(pubB);
        const secretB = aonB.deriveSharedSecret(pubA);
        aonA.establishTunnel('tun-123', '198.51.100.99:9900', secretA);
        aonB.establishTunnel('tun-123', '198.51.100.42:9900', secretB);
        const secretPlaintext = 'Highly sensitive distributed ledger weight updates';
        // Encrypt
        const encrypted = aonA.encryptMessage('tun-123', secretPlaintext);
        assert.ok(encrypted.ciphertext);
        assert.ok(encrypted.iv);
        assert.ok(encrypted.tag);
        // Decrypt
        const decrypted = aonB.decryptMessage('tun-123', encrypted.ciphertext, encrypted.iv, encrypted.tag);
        assert.strictEqual(decrypted, secretPlaintext);
    });
    test('CollaborationEngine integration verification', async () => {
        const engine = new CollaborationEngine();
        const mockCtx = {
            getWorkspacePath: () => './workspace/test-aon',
            runtimeId: 'node-aon-test'
        };
        await engine.initialize(mockCtx);
        const addr = await engine.GetPublicAddress();
        assert.strictEqual(addr.ip, '198.51.100.42');
        const tunnel = await engine.ConnectOverlayPeer('198.51.100.99', 9900, 'tunnel-test-e2e');
        assert.strictEqual(tunnel.peerAddress, '198.51.100.99:9900');
        assert.strictEqual(engine.GetActiveTunnels().length, 1);
    });
});
