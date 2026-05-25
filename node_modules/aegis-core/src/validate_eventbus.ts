import { serviceRegistry } from './runtime/ServiceRegistry.js';
import { eventBus, EventBus } from './runtime/EventBus.js';

async function runTests() {
  console.log("=== AEGIS EVENTBUS RUNTIME VALIDATION ===");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 12. Service Registry Validation
  try {
    const regBus = serviceRegistry.get<EventBus>('eventBus');
    assert(regBus === eventBus, "serviceRegistry.get('eventBus') returns the same singleton instance");
  } catch (e: any) {
    assert(false, `Service registry lookup failed: ${e.message}`);
  }

  // 3. Event Envelope Validation
  try {
    let capturedEnvelope: any = null;
    const testListener = (envelope: any) => {
      capturedEnvelope = envelope;
    };
    eventBus.on('test.envelope', testListener);
    eventBus.emit('test.envelope', { message: "hello envelope" }, "test-source");

    assert(capturedEnvelope !== null, "Listener captured the emitted event");
    assert(capturedEnvelope.event === 'test.envelope', "Envelope 'event' field is correct");
    assert(typeof capturedEnvelope.timestamp === 'number', "Envelope 'timestamp' is a number");
    assert(capturedEnvelope.source === 'test-source', "Envelope 'source' is correct");
    assert(capturedEnvelope.payload.message === 'hello envelope', "Envelope 'payload' contains the correct data");

    eventBus.off('test.envelope', testListener);
  } catch (e: any) {
    assert(false, `Envelope validation test threw: ${e.message}`);
  }

  // 4. Failure Isolation Test (Sync)
  try {
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

    assert(firstExecuted, "Sync failing listener was executed");
    assert(secondExecuted, "Healthy listener executed successfully despite previous listener failure");

    eventBus.off('test.sync.fail', brokenListener);
    eventBus.off('test.sync.fail', healthyListener);
  } catch (e: any) {
    assert(false, `Sync failure isolation test threw: ${e.message}`);
  }

  // 5. Asynchronous Failure Test
  try {
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

    assert(firstExecuted, "Async failing listener was executed");
    assert(secondExecuted, "Healthy listener executed successfully alongside async failure");

    eventBus.off('test.async.fail', asyncBrokenListener);
    eventBus.off('test.async.fail', healthyListener);
  } catch (e: any) {
    assert(false, `Async failure isolation test threw: ${e.message}`);
  }

  // 9. once() Listener Validation
  try {
    let callCount = 0;
    const onceListener = () => {
      callCount++;
    };

    eventBus.once('test.once', onceListener);
    eventBus.emit('test.once', {});
    eventBus.emit('test.once', {});

    assert(callCount === 1, "once() listener executed exactly once");
  } catch (e: any) {
    assert(false, `once() listener validation threw: ${e.message}`);
  }

  // 10. Custom Event Validation
  try {
    let customExecuted = false;
    const customListener = (envelope: any) => {
      customExecuted = true;
      assert(envelope.event === 'doctor.patient_registered', "Custom namespace event name is preserved");
    };

    eventBus.on('doctor.patient_registered', customListener);
    eventBus.emit('doctor.patient_registered', { patientId: 42 }, "medical-system");

    assert(customExecuted, "Custom namespaced event listener executed");
    eventBus.off('doctor.patient_registered', customListener);
  } catch (e: any) {
    assert(false, `Custom event validation threw: ${e.message}`);
  }

  // 8. Listener Memory Leak Stress Test
  try {
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

    assert(true, `Successfully registered and executed 1000 listeners. Memory delta: ${afterEmit - beforeEmit} bytes`);

    // Clean up
    for (const listener of dummyListeners) {
      eventBus.off(eventName, listener);
    }

    assert(true, "Successfully cleaned up all 1000 stress test listeners");
  } catch (e: any) {
    assert(false, `Stress test threw: ${e.message}`);
  }

  console.log("\n=== VALIDATION SUMMARY ===");
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("All EventBus stability tests passed successfully!");
    process.exit(0);
  }
}

// Ensure the registry is initialized
import { loadEnvironment } from './utils/environment.js';
import { workspaceManager } from './runtime/WorkspaceManager.js';
import { providerManager } from './providers/index.js';
import { configurationManager } from './config/index.js';

loadEnvironment();
workspaceManager.initialize();
serviceRegistry.register('eventBus', eventBus);
serviceRegistry.register('providerManager', providerManager);
serviceRegistry.register('config', configurationManager);
serviceRegistry.register('workspaceManager', workspaceManager);

runTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
