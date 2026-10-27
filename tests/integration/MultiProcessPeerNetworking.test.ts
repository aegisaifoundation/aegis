import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function spawnChild(name: string, port: number, nodeDir: string): { child: ChildProcess; waitForEvent: (event: string, timeoutMs?: number) => Promise<any> } {
  const childScript = path.resolve(__dirname, 'MultiProcessChildNode.ts');

  const child = fork(childScript, [], {
    execArgv: ['--import', 'tsx'],
    env: {
      ...process.env,
      NODE_NAME: name,
      NODE_PORT: port.toString(),
      NODE_DIR: nodeDir,
      AEGIS_ALLOW_LOOPBACK: 'true'
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });

  child.stdout?.on('data', (d) => {
    console.log(`[${name}] ${d.toString().trim()}`);
  });

  child.stderr?.on('data', (d) => {
    console.error(`[${name} ERR] ${d.toString().trim()}`);
  });

  const receivedEvents: any[] = [];
  const eventWaiters = new Map<string, Array<(payload: any) => void>>();

  child.on('message', (msg: any) => {
    if (msg && msg.event) {
      const waiters = eventWaiters.get(msg.event);
      if (waiters && waiters.length > 0) {
        const cb = waiters.shift()!;
        cb(msg);
      } else {
        receivedEvents.push(msg);
      }
    }
  });

  const waitForEvent = (targetEvent: string, timeoutMs = 8000): Promise<any> => {
    const idx = receivedEvents.findIndex(m => m.event === targetEvent);
    if (idx !== -1) {
      const [msg] = receivedEvents.splice(idx, 1);
      return Promise.resolve(msg);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for child ${name} event: "${targetEvent}"`));
      }, timeoutMs);

      if (!eventWaiters.has(targetEvent)) {
        eventWaiters.set(targetEvent, []);
      }

      eventWaiters.get(targetEvent)!.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  };

  return { child, waitForEvent };
}

async function runMultiProcessIntegrationTest() {
  console.log('\n============================================================');
  console.log('  AEGIS Multi-Process Cross-Process P2P Integration Test');
  console.log('============================================================\n');

  const tempBase = path.resolve(__dirname, '../../temporary/multi-proc-test-' + Date.now());
  const dirA = path.join(tempBase, 'node_A');
  const dirB = path.join(tempBase, 'node_B');

  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });

  let childAInfo: ReturnType<typeof spawnChild> | null = null;
  let childBInfo: ReturnType<typeof spawnChild> | null = null;

  try {
    // ------------------------------------------------------------------------
    // Step 1: Spawn Node Process A and Node Process B
    // ------------------------------------------------------------------------
    console.log('[Step 1] Spawning Independent OS Processes for Node A and Node B');
    childAInfo = spawnChild('NodeProcessA', 20110, dirA);
    childBInfo = spawnChild('NodeProcessB', 20120, dirB);

    const readyA = await childAInfo.waitForEvent('ready');
    const readyB = await childBInfo.waitForEvent('ready');

    console.log(`  ✔ Child Process A initialized (PID: ${childAInfo.child.pid}, NodeId: ${readyA.nodeId})`);
    console.log(`  ✔ Child Process B initialized (PID: ${childBInfo.child.pid}, NodeId: ${readyB.nodeId})`);

    assert.ok(readyA.nodeId.startsWith('aegis://'), 'Node A must have canonical nodeId');
    assert.ok(readyB.nodeId.startsWith('aegis://'), 'Node B must have canonical nodeId');
    assert.notStrictEqual(readyA.nodeId, readyB.nodeId, 'Both child processes must have distinct nodeIds');

    // ------------------------------------------------------------------------
    // Step 2: Register Peer and Connect
    // ------------------------------------------------------------------------
    console.log('\n[Step 2] Cross-Process Peer Registration & Handshake');
    // Register B in A
    childAInfo.child.send({ action: 'register', targetId: readyB.nodeId, host: '127.0.0.1', port: readyB.msgPort });
    await childAInfo.waitForEvent('registered');

    // Register A in B
    childBInfo.child.send({ action: 'register', targetId: readyA.nodeId, host: '127.0.0.1', port: readyA.msgPort });
    await childBInfo.waitForEvent('registered');

    // Connect A -> B
    childAInfo.child.send({ action: 'connect', targetId: readyB.nodeId });
    await childAInfo.waitForEvent('connected');

    // Wait for connection promotion to ACTIVE
    console.log('  Waiting for mutual handshake completion across processes...');
    let stateActive = false;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const stateEv = await childAInfo.waitForEvent('peer_state', 500).catch(() => null);
      if (stateEv && stateEv.peerId === readyB.nodeId && stateEv.state === 'ACTIVE') {
        stateActive = true;
        break;
      }
    }
    assert.ok(stateActive, 'Node A connection state to Node B must become ACTIVE across processes');
    console.log(`  ✔ Mutual cross-process handshake verified (State: ACTIVE)`);

    // ------------------------------------------------------------------------
    // Step 3: Bidirectional Cross-Process Message Delivery
    // ------------------------------------------------------------------------
    console.log('\n[Step 3] Bidirectional Cross-Process Application Message Exchange');

    // Send A -> B
    const payloadA = { text: 'Cross-process ping from Alpha', timestamp: Date.now() };
    childAInfo.child.send({ action: 'send', targetId: readyB.nodeId, payload: payloadA });

    const msgAtB = await childBInfo.waitForEvent('message');
    assert.strictEqual(msgAtB.senderId, readyA.nodeId, 'Node B must report senderId as canonical Node A ID');
    assert.strictEqual(msgAtB.payload.text, payloadA.text, 'Node B must receive exact payload sent from Node A');
    console.log(`  ✔ Delivered A -> B across process boundary (Sender: ${msgAtB.senderId})`);

    // Send B -> A
    const payloadB = { text: 'Cross-process pong reply from Beta', timestamp: Date.now() };
    childBInfo.child.send({ action: 'send', targetId: readyA.nodeId, payload: payloadB });

    const msgAtA = await childAInfo.waitForEvent('message');
    assert.strictEqual(msgAtA.senderId, readyB.nodeId, 'Node A must report senderId as canonical Node B ID');
    assert.strictEqual(msgAtA.payload.text, payloadB.text, 'Node A must receive exact payload sent from Node B');
    console.log(`  ✔ Delivered B -> A across process boundary (Sender: ${msgAtA.senderId})`);

    // ------------------------------------------------------------------------
    // Step 4: Disconnection Detection upon Process Termination
    // ------------------------------------------------------------------------
    console.log('\n[Step 4] Disconnection Detection upon Remote Process Exit');
    // Terminate Child Process B
    childBInfo.child.kill('SIGKILL');
    console.log(`  Terminated Child Process B (PID: ${childBInfo.child.pid})`);

    let disconnectedDetected = false;
    const disconnectDeadline = Date.now() + 5000;
    while (Date.now() < disconnectDeadline) {
      const stateEv = await childAInfo.waitForEvent('peer_state', 500).catch(() => null);
      if (stateEv && stateEv.peerId === readyB.nodeId && stateEv.state === 'DISCONNECTED') {
        disconnectedDetected = true;
        break;
      }
    }
    assert.ok(disconnectedDetected, 'Node A must detect remote process termination and update state to DISCONNECTED');
    console.log('  ✔ Node A detected socket closure and updated peer state to DISCONNECTED');

    // ------------------------------------------------------------------------
    // Step 5: Process Restart and Automatic Reconnection
    // ------------------------------------------------------------------------
    console.log('\n[Step 5] Remote Process Restart & Automatic Reconnection');
    console.log('  Restarting Child Process B with preserved persistent identity...');
    childBInfo = spawnChild('NodeProcessB_Restarted', 20120, dirB);
    const readyB2 = await childBInfo.waitForEvent('ready');

    assert.strictEqual(readyB2.nodeId, readyB.nodeId, 'Restarted Child B MUST load identical persistent canonical identity');
    console.log(`  ✔ Restarted Child B with identical identity: ${readyB2.nodeId}`);

    // Wait for Node A's backoff reconnect timer to reconnect to restarted Node B
    console.log('  Waiting for Node A automatic reconnection...');
    let reconnected = false;
    const reconnectDeadline = Date.now() + 6000;
    while (Date.now() < reconnectDeadline) {
      const stateEv = await childAInfo.waitForEvent('peer_state', 500).catch(() => null);
      if (stateEv && stateEv.peerId === readyB.nodeId && stateEv.state === 'ACTIVE') {
        reconnected = true;
        break;
      }
    }
    assert.ok(reconnected, 'Node A must automatically re-establish ACTIVE connection with restarted Node B');
    console.log('  ✔ Automatic cross-process reconnection succeeded (State: ACTIVE)');

    console.log('\n============================================================');
    console.log('  ✔ MULTI-PROCESS P2P INTEGRATION TEST PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } finally {
    if (childAInfo) {
      try { childAInfo.child.kill('SIGKILL'); } catch {}
    }
    if (childBInfo) {
      try { childBInfo.child.kill('SIGKILL'); } catch {}
    }
    try {
      fs.rmSync(tempBase, { recursive: true, force: true });
    } catch {}
  }
}

runMultiProcessIntegrationTest().catch((err) => {
  console.error('\n❌ Multi-Process Integration Test Failed:', err);
  process.exit(1);
});
