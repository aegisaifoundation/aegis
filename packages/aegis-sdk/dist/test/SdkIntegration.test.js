import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { serviceRegistry } from '@aegis/runtime';
import { AegisSDK, FeatureUnavailable } from '../index.js';
describe('AEGIS SDK (ASDK) & AISCI Integration Tests', () => {
    // Mock EventBus
    const mockEventBus = {
        listeners: new Map(),
        on(event, fn) {
            if (!this.listeners.has(event))
                this.listeners.set(event, new Set());
            this.listeners.get(event).add(fn);
        },
        emit(event, payload) {
            const set = this.listeners.get(event);
            if (set) {
                set.forEach(fn => fn(payload));
            }
        }
    };
    before(() => {
        serviceRegistry.register('eventBus', mockEventBus);
    });
    test('Mock Transport initialization and basic queries', async () => {
        const aegis = await AegisSDK.initialize({ transport: 'mock', endpoint: 'localhost:8080' });
        const ver = await aegis.version();
        assert.strictEqual(ver, '1.0.0');
        const inf = await aegis.generate('Summarize clinic trial notes');
        assert.ok(inf.text.includes('Mock response'));
        await aegis.shutdown();
    });
    test('Loopback Transport and engine routing', async () => {
        // Register mock engine
        const mockInference = {
            generate: async (prompt) => ({ text: `Generated response to: ${prompt}`, model: 'llama-3' })
        };
        serviceRegistry.register('aegis-distributed-inference', mockInference);
        const aegis = await AegisSDK.initialize({ transport: 'loopback' });
        const output = await aegis.generate('Check node status');
        assert.strictEqual(output.model, 'llama-3');
        assert.ok(output.text.includes('Check node status'));
        await aegis.shutdown();
    });
    test('Graceful degradation on absent engines', async () => {
        // Unregister memory engine/gateway if registered
        serviceRegistry.register('aegis-swarm-learning', null);
        const aegis = await AegisSDK.initialize({ transport: 'loopback' });
        try {
            await aegis.createSwarm('swarm-node-cluster');
            assert.fail('Should have failed due to missing engine');
        }
        catch (err) {
            assert.ok(err instanceof FeatureUnavailable);
            assert.strictEqual(err.code, 'FeatureUnavailable');
            assert.ok(err.message.includes('unavailable'));
        }
        await aegis.shutdown();
    });
    test('Event streaming subscriptions and notification', async () => {
        const aegis = await AegisSDK.initialize({ transport: 'loopback' });
        let receivedPayload = null;
        await aegis.subscribe('TrainingProgress', (payload) => {
            receivedPayload = payload;
        });
        // Emit event from runtime event bus
        mockEventBus.emit('TrainingProgress', { jobId: 'job-999', loss: 0.12 });
        // Wait a brief tick
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.ok(receivedPayload);
        assert.strictEqual(receivedPayload.jobId, 'job-999');
        assert.strictEqual(receivedPayload.loss, 0.12);
    });
});
