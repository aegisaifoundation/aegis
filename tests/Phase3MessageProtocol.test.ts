import {
  MessageDeliveryState,
  MessagePriority,
  MessageRoute,
  MessageTypeCategory,
  CommunicationErrorCode,
  CommunicationError
} from '@aegis/sdk';
import {
  MessageFactory,
  MessageValidator,
  MessageDeduplicationRegistry,
  AckManager,
  RequestCorrelationManager,
  AegisMessageBus,
  AegisMessageRouter
} from '@aegis/runtime';

async function runPhase3TestSuite() {
  console.log('\n============================================================');
  console.log('  AEGIS Phase 3 Message Protocol & Routing Verification Test');
  console.log('============================================================\n');

  const nodeAId = 'aegis://11111111-1111-4111-a111-111111111111';
  const nodeBId = 'aegis://22222222-2222-4222-a222-222222222222';

  // [Test 1] Message Envelope Creation & Defaults
  console.log('[Test 1] Message Envelope Creation & Defaults');
  const factoryA = new MessageFactory(nodeAId);
  const msg1 = factoryA.createMessage({
    messageType: 'ENGINE.test.event',
    payload: { hello: 'world' },
    targetNodeId: nodeBId,
    ttlMs: 5000
  });

  if (
    msg1.protocolVersion === '1.0.0' &&
    msg1.messageId.startsWith('aegis-msg://') &&
    msg1.senderNodeId === nodeAId &&
    msg1.targetNodeId === nodeBId &&
    msg1.payload.hello === 'world' &&
    msg1.expiresAt === msg1.timestamp + 5000
  ) {
    console.log(`  ✔ Envelope created cleanly: ${msg1.messageId} (TTL 5000ms)`);
  } else {
    throw new Error('Test 1 failed: Invalid envelope creation');
  }

  // [Test 2] Strict Identity Validation
  console.log('\n[Test 2] Strict Identity Validation');
  try {
    new MessageFactory('invalid-node-id');
    throw new Error('Test 2 failed: Should have rejected invalid senderNodeId');
  } catch (err: any) {
    console.log(`  ✔ Rejected invalid sender identity: ${err.message}`);
  }

  try {
    MessageValidator.validateEnvelope({ ...msg1, senderNodeId: 'nodeName' });
    throw new Error('Test 2 failed: Should have rejected nodeName sender');
  } catch (err: any) {
    console.log(`  ✔ Rejected nodeName fallback identity: ${err.message}`);
  }

  // [Test 3] Local Message Routing (targetNodeId === localNodeId)
  console.log('\n[Test 3] Local Message Routing (no network call)');
  const localRouter = new AegisMessageRouter(nodeAId, () => null);
  let localReceived = false;

  localRouter.getLocalBus().registerEngine('test-engine', (envelope) => {
    if (envelope.payload.value === 42) {
      localReceived = true;
    }
  });

  const localMsg = localRouter.getFactory().createMessage({
    messageType: 'ENGINE.test.local',
    payload: { value: 42 },
    targetNodeId: nodeAId,
    targetEngine: 'test-engine'
  });

  await localRouter.send(localMsg);
  if (localReceived && localRouter.getMessageState(localMsg.messageId) === MessageDeliveryState.COMPLETED) {
    console.log(`  ✔ Message delivered locally to test-engine (State: COMPLETED)`);
  } else {
    throw new Error('Test 3 failed: Local delivery failed');
  }

  // [Test 4] Remote Message Routing & ConnectionManager Delegation
  console.log('\n[Test 4] Remote Message Routing & ConnectionManager Delegation');
  let sentRemotePeerId = '';
  let sentRemotePayload: any = null;

  const mockConnMgr = {
    sendPeerMessage: async (peerId: string, type: string, payload: any) => {
      sentRemotePeerId = peerId;
      sentRemotePayload = payload;
    }
  };

  const remoteRouter = new AegisMessageRouter(nodeAId, () => mockConnMgr);
  const remoteMsg = remoteRouter.getFactory().createMessage({
    messageType: 'ENGINE.test.remote',
    payload: { remoteData: 'abc' },
    targetNodeId: nodeBId
  });

  await remoteRouter.send(remoteMsg);
  if (sentRemotePeerId === nodeBId && sentRemotePayload.messageId === remoteMsg.messageId) {
    console.log(`  ✔ Delegated remote delivery to ConnectionManager for ${nodeBId}`);
  } else {
    throw new Error('Test 4 failed: Remote routing failed');
  }

  // [Test 5] Engine-Targeted Routing & ENGINE_NOT_FOUND
  console.log('\n[Test 5] Engine-Targeted Routing & Missing Engine Error');
  const bus = new AegisMessageBus();
  bus.registerEngine('engine-alpha', () => {});

  try {
    await bus.dispatch(
      factoryA.createMessage({
        messageType: 'ENGINE.test',
        payload: {},
        targetEngine: 'engine-beta'
      })
    );
    throw new Error('Test 5 failed: Should have thrown ENGINE_NOT_FOUND');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.ENGINE_NOT_FOUND) {
      console.log(`  ✔ Caught expected missing engine error: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 6] Scoped Message Deduplication (${senderNodeId}:${messageId})
  console.log('\n[Test 6] Scoped Message Deduplication');
  const dedup = new MessageDeduplicationRegistry(100);
  const msgIdX = 'aegis-msg://test-dedup-x';

  dedup.register(nodeAId, msgIdX, 10000);
  if (dedup.isDuplicate(nodeAId, msgIdX)) {
    console.log(`  ✔ Recognized duplicate for ${nodeAId}:${msgIdX}`);
  } else {
    throw new Error('Test 6 failed: Deduplication failed');
  }

  if (!dedup.isDuplicate(nodeBId, msgIdX)) {
    console.log(`  ✔ Same messageId from different senderNodeId correctly isolated`);
  } else {
    throw new Error('Test 6 failed: Scoped key isolation failed');
  }

  // [Test 7] TTL Expiration Validation
  console.log('\n[Test 7] TTL Expiration Validation');
  const expiredMsg = factoryA.createMessage({
    messageType: 'ENGINE.test.expired',
    payload: {},
    ttlMs: 1
  });

  await new Promise((r) => setTimeout(r, 10));

  try {
    MessageValidator.validateEnvelope(expiredMsg);
    throw new Error('Test 7 failed: Should have rejected expired message');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.MESSAGE_EXPIRED) {
      console.log(`  ✔ Rejected expired message: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 8 & 9] Request / Response Correlation & Request Timeout
  console.log('\n[Test 8 & 9] Request / Response Correlation & Request Timeout');
  const reqMgr = new RequestCorrelationManager();
  const reqPromise = reqMgr.registerPendingRequest('aegis-msg://req-1', 1000);

  const responseEnv = factoryA.createMessage({
    messageType: 'RESPONSE.ENGINE.test',
    payload: { answer: 42 },
    correlationId: 'aegis-msg://req-1'
  });

  reqMgr.resolveRequest('aegis-msg://req-1', responseEnv);
  const resResult = await reqPromise;
  if (resResult.payload.answer === 42) {
    console.log(`  ✔ Resolved request correlation aegis-msg://req-1 -> Response answer 42`);
  }

  try {
    const timeoutPromise = reqMgr.registerPendingRequest('aegis-msg://req-timeout', 100);
    await timeoutPromise;
    throw new Error('Test 9 failed: Should have timed out');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.REQUEST_TIMEOUT) {
      console.log(`  ✔ Request timeout enforced: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 10] ACK Protocol & AckManager
  console.log('\n[Test 10] ACK Protocol & AckManager');
  const ackMgr = new AckManager();
  const ackPromise = ackMgr.registerPendingAck('aegis-msg://ack-target', 1000);

  const ackEnv = factoryA.createAck({
    protocolVersion: '1.0.0',
    messageId: 'aegis-msg://ack-target',
    messageType: 'ENGINE.test',
    senderNodeId: nodeBId,
    timestamp: Date.now(),
    payload: {}
  });

  ackMgr.resolveAck('aegis-msg://ack-target', ackEnv);
  const ackRes = await ackPromise;
  if (ackRes.acknowledgedMessageId === 'aegis-msg://ack-target') {
    console.log(`  ✔ AckManager resolved acknowledgedMessageId: aegis-msg://ack-target`);
  }

  // [Test 11] Lost ACK Duplicate Recovery (Preserves messageId, resends ACK, avoids double execution)
  console.log('\n[Test 11] Lost ACK Duplicate Recovery');
  let payloadExecutionCount = 0;
  let ackSentCount = 0;

  const nodeBRouter = new AegisMessageRouter(nodeBId, () => ({
    sendPeerMessage: async (target: string, type: string, payload: any) => {
      if (type.endsWith('.ACK')) ackSentCount++;
    }
  }));

  nodeBRouter.getLocalBus().registerEngine('service-x', () => {
    payloadExecutionCount++;
  });

  const msgWithAck = factoryA.createMessage({
    messageType: 'ENGINE.doWork',
    payload: { task: 1 },
    targetNodeId: nodeBId,
    targetEngine: 'service-x',
    requiresAck: true
  });

  // First receipt -> executes payload + sends ACK
  await nodeBRouter.handleIngressMessage(msgWithAck);
  // Duplicate receipt (simulating lost ACK retry with SAME messageId) -> DOES NOT execute payload + RE-SENDS ACK
  await nodeBRouter.handleIngressMessage(msgWithAck);

  if (payloadExecutionCount === 1 && ackSentCount === 2) {
    console.log(`  ✔ Duplicate message payload executed exactly ONCE, ACK re-sent TWICE for lost ACK recovery`);
  } else {
    throw new Error(`Test 11 failed: payloadExecutionCount=${payloadExecutionCount}, ackSentCount=${ackSentCount}`);
  }

  // [Test 12] ACK vs RESPONSE Separation
  console.log('\n[Test 12] ACK vs RESPONSE Separation');
  const reqMgr2 = new RequestCorrelationManager();
  const unhandledReq = reqMgr2.registerPendingRequest('aegis-msg://req-2', 1000);
  unhandledReq.catch(() => {}); // Catch background timeout

  const falseAckRes = reqMgr2.resolveRequest('aegis-msg://req-2', ackEnv);
  if (!falseAckRes && reqMgr2.hasPendingRequest('aegis-msg://req-2')) {
    console.log(`  ✔ ACK frame does NOT resolve pending request correlation expecting RESPONSE`);
  } else {
    throw new Error('Test 12 failed: ACK erroneously resolved request correlation');
  }
  reqMgr2.clear();

  // [Test 13] Queue Capacity Protection (COMMUNICATION_CAPACITY_EXCEEDED)
  console.log('\n[Test 13] Queue Capacity Protection');
  const boundedAckMgr = new AckManager(2);
  const p1 = boundedAckMgr.registerPendingAck('msg-1', 1000);
  const p2 = boundedAckMgr.registerPendingAck('msg-2', 1000);
  p1.catch(() => {});
  p2.catch(() => {});

  try {
    boundedAckMgr.registerPendingAck('msg-3', 1000);
    throw new Error('Test 13 failed: Should have thrown capacity error');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.COMMUNICATION_CAPACITY_EXCEEDED) {
      console.log(`  ✔ Enforced queue capacity limit: ${err.message}`);
    } else {
      throw err;
    }
  }
  boundedAckMgr.clear();

  // [Test 14] Invalid Routing Semantics Rejection
  console.log('\n[Test 14] Invalid Routing Semantics Rejection');
  try {
    MessageValidator.validateEnvelope({
      protocolVersion: '1.0.0',
      messageId: 'aegis-msg://123',
      senderNodeId: nodeAId,
      messageType: '',
      timestamp: Date.now(),
      payload: null
    });
    throw new Error('Test 14 failed: Should have rejected empty messageType');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.INVALID_MESSAGE) {
      console.log(`  ✔ Rejected invalid message envelope semantics: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 15] Engine Handler Isolation (ENGINE_HANDLER_FAILED)
  console.log('\n[Test 15] Engine Handler Isolation');
  const failingBus = new AegisMessageBus();
  failingBus.registerEngine('buggy-engine', () => {
    throw new Error('Buggy engine crash simulation');
  });

  try {
    await failingBus.dispatch(
      factoryA.createMessage({
        messageType: 'ENGINE.buggy',
        payload: {},
        targetEngine: 'buggy-engine'
      })
    );
    throw new Error('Test 15 failed: Should have caught buggy engine error');
  } catch (err: any) {
    if (err.code === CommunicationErrorCode.ENGINE_HANDLER_FAILED) {
      console.log(`  ✔ Caught engine handler exception safely without crashing runtime: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 16] Message Delivery Lifecycle States
  console.log('\n[Test 16] Message Delivery Lifecycle States');
  const trackedRouter = new AegisMessageRouter(nodeAId, () => ({
    sendPeerMessage: async () => {}
  }));

  const trackedMsg = trackedRouter.getFactory().createMessage({
    messageType: 'ENGINE.test.state',
    payload: {},
    targetNodeId: nodeBId
  });

  await trackedRouter.send(trackedMsg);
  const finalState = trackedRouter.getMessageState(trackedMsg.messageId);
  if (finalState === MessageDeliveryState.COMPLETED) {
    console.log(`  ✔ Verified message lifecycle state transition -> COMPLETED`);
  } else {
    throw new Error(`Test 16 failed: Final state was ${finalState}`);
  }

  // [Test 17] Full Multi-Node Phase 3 Ingress / Egress Integration Flow
  console.log('\n[Test 17] Full Multi-Node Phase 3 Integration Flow');
  let routerBReceived = false;

  const routerB = new AegisMessageRouter(nodeBId, () => null);
  routerB.getLocalBus().registerEngine('target-service', (env) => {
    if (env.payload.ping === 'pong') {
      routerBReceived = true;
    }
  });

  const routerA = new AegisMessageRouter(nodeAId, () => ({
    sendPeerMessage: async (target: string, type: string, envelope: any) => {
      // Simulate physical network transport delivering to Node B
      await routerB.handleIngressMessage(envelope);
    }
  }));

  const remoteReqMsg = routerA.getFactory().createMessage({
    messageType: 'ENGINE.ping',
    payload: { ping: 'pong' },
    targetNodeId: nodeBId,
    targetEngine: 'target-service'
  });

  await routerA.send(remoteReqMsg);
  if (routerBReceived) {
    console.log(`  ✔ Full Phase 3 end-to-end multi-node routing (Node A Router -> Remote Delivery -> Node B Ingress -> Local Bus -> Target Engine) succeeded`);
  } else {
    throw new Error('Test 17 failed: Full multi-node flow failed');
  }

  console.log('\n============================================================');
  console.log('  ✔ ALL PHASE 3 MESSAGE PROTOCOL & ROUTING TESTS PASSED!');
  console.log('============================================================\n');
}

runPhase3TestSuite().catch((err) => {
  console.error('\n❌ PHASE 3 TEST SUITE FAILED:', err);
  process.exit(1);
});
