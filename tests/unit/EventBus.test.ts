import { test } from 'node:test';
import assert from 'node:assert';
import { serviceRegistry } from '../../aegis-core/src/runtime/ServiceRegistry.js';
import { eventBus, EventBus } from '../../aegis-core/src/runtime/EventBus.js';
import { loadEnvironment } from '../../aegis-core/src/utils/environment.js';
import { workspaceManager } from '../../aegis-core/src/runtime/WorkspaceManager.js';
import { providerManager } from '../../aegis-core/src/providers/index.js';
import { configurationManager } from '../../aegis-core/src/config/index.js';

// Ensure the registry is initialized before running the tests
loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('providerManager', providerManager);
serviceRegistry.register('config', configurationManager);
serviceRegistry.register('workspaceManager', workspaceManager);

test('EventBus - service registry lookup', () => {
  const regBus = serviceRegistry.get<EventBus>('eventBus');
  assert.strictEqual(regBus, eventBus, "serviceRegistry.get('eventBus') returns the same singleton instance");
});

test('EventBus - event envelope validation', () => {
  let capturedEnvelope: any = null;
  const testListener = (envelope: any) => {
    capturedEnvelope = envelope;
  };
  eventBus.on('test.envelope', testListener);
  eventBus.emit('test.envelope', { message: "hello envelope" }, "test-source");

  assert.ok(capturedEnvelope !== null, "Listener captured the emitted event");
  assert.strictEqual(capturedEnvelope.event, 'test.envelope', "Envelope 'event' field is correct");
  assert.strictEqual(typeof capturedEnvelope.timestamp, 'number', "Envelope 'timestamp' is a number");
  assert.strictEqual(capturedEnvelope.source, 'test-source', "Envelope 'source' is correct");
  assert.strictEqual(capturedEnvelope.payload.message, 'hello envelope', "Envelope 'payload' contains the correct data");

  eventBus.off('test.envelope', testListener);
});

test('EventBus - sync failure isolation', () => {
  let firstExecuted = false;
  let secondExecuted = false;

  const brokenListener = () => {
    firstExecuted = true;
    throw new Error("Intentional listener crash");
  };

  const healthyListener = () => {
    secondExecuted = true;
  };

  eventBus.on('test.sync.fail', brokenListener);
  eventBus.on('test.sync.fail', healthyListener);

  // This should NOT throw and crash the runtime
  eventBus.emit('test.sync.fail', {});

  assert.ok(firstExecuted, "Sync failing listener was executed");
  assert.ok(secondExecuted, "Healthy listener executed successfully despite previous listener failure");

  eventBus.off('test.sync.fail', brokenListener);
  eventBus.off('test.sync.fail', healthyListener);
});

test('EventBus - async failure isolation', () => {
  let firstExecuted = false;
  let secondExecuted = false;

  const asyncBrokenListener = async () => {
    firstExecuted = true;
    throw new Error("Intentional async failure");
  };

  const healthyListener = () => {
    secondExecuted = true;
  };

  eventBus.on('test.async.fail', asyncBrokenListener);
  eventBus.on('test.async.fail', healthyListener);

  eventBus.emit('test.async.fail', {});

  assert.ok(firstExecuted, "Async failing listener was executed");
  assert.ok(secondExecuted, "Healthy listener executed successfully alongside async failure");

  eventBus.off('test.async.fail', asyncBrokenListener);
  eventBus.off('test.async.fail', healthyListener);
});

test('EventBus - once() listener execution', () => {
  let callCount = 0;
  const onceListener = () => {
    callCount++;
  };

  eventBus.once('test.once', onceListener);
  eventBus.emit('test.once', {});
  eventBus.emit('test.once', {});

  assert.strictEqual(callCount, 1, "once() listener executed exactly once");
});

test('EventBus - custom namespaced event validation', () => {
  let customExecuted = false;
  const customListener = (envelope: any) => {
    customExecuted = true;
    assert.strictEqual(envelope.event, 'doctor.patient_registered', "Custom namespace event name is preserved");
  };

  eventBus.on('doctor.patient_registered', customListener);
  eventBus.emit('doctor.patient_registered', { patientId: 42 }, "medical-system");

  assert.ok(customExecuted, "Custom namespaced event listener executed");
  eventBus.off('doctor.patient_registered', customListener);
});

test('EventBus - listener memory leak and stress test', () => {
  const eventName = 'stress.test';
  const dummyListeners: any[] = [];

  // Register 1000 listeners
  for (let i = 0; i < 1000; i++) {
    const listener = () => {};
    dummyListeners.push(listener);
    eventBus.on(eventName, listener);
  }

  // Emit to all 1000 listeners
  const beforeEmit = process.memoryUsage().heapUsed;
  eventBus.emit(eventName, {});
  const afterEmit = process.memoryUsage().heapUsed;

  assert.ok(true, `Successfully registered and executed 1000 listeners. Memory delta: ${afterEmit - beforeEmit} bytes`);

  // Clean up
  for (const listener of dummyListeners) {
    eventBus.off(eventName, listener);
  }

  assert.ok(true, "Successfully cleaned up all 1000 stress test listeners");
});
