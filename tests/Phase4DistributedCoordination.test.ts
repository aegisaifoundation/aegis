import {
  TaskState,
  TaskPriority,
  CoordinationError,
  CoordinationErrorCode
} from '@aegis/sdk';
import {
  DistributedTaskManager,
  NodeCapabilityRegistry,
  TaskScheduler,
  TaskStateValidator,
  TaskWorkerRuntime,
  TaskRecoveryManager,
  TaskExecutionRegistry,
  AegisMessageRouter,
  PeerRegistry,
  SchedulingStrategy
} from '@aegis/runtime';

async function runPhase4TestSuite() {
  console.log('\n============================================================');
  console.log('  AEGIS Phase 4 Distributed Coordination & Execution Test');
  console.log('============================================================\n');

  const nodeAId = 'aegis://11111111-1111-4111-a111-111111111111';
  const nodeBId = 'aegis://22222222-2222-4222-a222-222222222222';
  const nodeCId = 'aegis://33333333-3333-4333-a333-333333333333';

  // [Test 1] Task Creation & Canonical Identity
  console.log('[Test 1] Task Creation & Canonical Identity');
  const mockRouterA = new AegisMessageRouter(nodeAId, () => null);
  const peerRegA = new PeerRegistry(true);
  const taskMgrA = new DistributedTaskManager(nodeAId, mockRouterA, peerRegA);

  const task1 = taskMgrA.createTask({
    type: 'data-processing',
    payload: { dataset: 'iris.csv' },
    priority: TaskPriority.HIGH
  });

  if (
    task1.taskId.startsWith('aegis-task://') &&
    task1.creatorNodeId === nodeAId &&
    task1.state === TaskState.CREATED &&
    task1.executionAttempt === 1
  ) {
    console.log(`  ✔ Task created cleanly: ${task1.taskId} (Creator: ${nodeAId})`);
  } else {
    throw new Error('Test 1 failed: Invalid task creation');
  }

  // [Test 2] Task Identity Persistence Across Retries/Reassignment
  console.log('\n[Test 2] Task Identity Persistence Across Retries/Reassignment');
  const recoveryMgr = new TaskRecoveryManager();
  const retryTask = recoveryMgr.prepareReassignment(task1, 3);

  if (retryTask.taskId === task1.taskId && retryTask.executionAttempt === 2) {
    console.log(`  ✔ Reassigned task preserved exact taskId (${retryTask.taskId}) while incrementing attempt to 2`);
  } else {
    throw new Error('Test 2 failed: Task identity changed during retry');
  }

  // [Test 3 & 4] Task State Machine & Invalid State Transitions
  console.log('\n[Test 3 & 4] Task State Machine Validation');
  TaskStateValidator.validateTransition(task1.taskId, TaskState.CREATED, TaskState.QUEUED);
  console.log(`  ✔ Valid transition CREATED -> QUEUED permitted`);

  try {
    TaskStateValidator.validateTransition(task1.taskId, TaskState.COMPLETED, TaskState.RUNNING);
    throw new Error('Test 4 failed: Should have thrown INVALID_TASK_STATE');
  } catch (err: any) {
    if (err.code === CoordinationErrorCode.INVALID_TASK_STATE) {
      console.log(`  ✔ Rejected invalid state transition COMPLETED -> RUNNING: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 5 & 6] Capability Advertisement & Matching
  console.log('\n[Test 5 & 6] Capability Advertisement & Matching');
  const capReg = new NodeCapabilityRegistry(nodeAId);
  capReg.registerCapabilities({
    nodeId: nodeBId,
    capabilities: ['distributed-inference', 'gpu-compute'],
    resources: { cpuCores: 8, memoryMB: 16384, gpuAvailable: true, gpuMemoryMB: 8192 },
    updatedAt: Date.now()
  });

  capReg.registerCapabilities({
    nodeId: nodeCId,
    capabilities: ['data-processing'],
    resources: { cpuCores: 2, memoryMB: 2048, gpuAvailable: false },
    updatedAt: Date.now()
  });

  const scheduler = new TaskScheduler(nodeAId, capReg);
  const gpuTask = taskMgrA.createTask({
    type: 'distributed-inference',
    payload: {},
    requirements: {
      requiredCapabilities: ['distributed-inference', 'gpu-compute'],
      requiresGpu: true
    }
  });

  if (scheduler.isNodeEligible(gpuTask, nodeBId) && !scheduler.isNodeEligible(gpuTask, nodeCId)) {
    console.log(`  ✔ Node B matched GPU requirements; Node C correctly disqualified`);
  } else {
    throw new Error('Test 6 failed: Capability matching failed');
  }

  // [Test 7 & 8] Local Preferred vs Remote Scheduling
  console.log('\n[Test 7 & 8] Local Preferred vs Remote Scheduling');
  capReg.registerCapabilities({
    nodeId: nodeAId,
    capabilities: ['data-processing'],
    updatedAt: Date.now()
  });

  const localTask = taskMgrA.createTask({
    type: 'data-processing',
    payload: {},
    requirements: { requiredCapabilities: ['data-processing'] }
  });

  const selectedLocal = scheduler.selectNode(localTask, [nodeAId, nodeBId, nodeCId], {
    strategy: SchedulingStrategy.LOCAL_PREFERRED,
    allowLocalExecution: true,
    allowRemoteExecution: true
  });

  const selectedRemote = scheduler.selectNode(gpuTask, [nodeAId, nodeBId, nodeCId], {
    strategy: SchedulingStrategy.LOCAL_PREFERRED,
    allowLocalExecution: true,
    allowRemoteExecution: true
  });

  if (selectedLocal === nodeAId && selectedRemote === nodeBId) {
    console.log(`  ✔ Selected local node (${nodeAId}) for local-capable task, remote node (${nodeBId}) for GPU task`);
  } else {
    throw new Error('Test 7/8 failed: Scheduling strategy failed');
  }

  // [Test 9] Explicit Task Acceptance Requirement (TASK_ASSIGN != ACCEPTED)
  console.log('\n[Test 9] Explicit Task Acceptance Requirement');
  const workerRuntime = new TaskWorkerRuntime(nodeBId, 5, 20);
  const unacceptedTask = taskMgrA.createTask({ type: 'unsupported-type', payload: {} });

  const acceptanceCheck = workerRuntime.canAcceptTask(unacceptedTask);
  if (!acceptanceCheck.canAccept && acceptanceCheck.reason?.includes('TASK_NOT_SUPPORTED')) {
    console.log(`  ✔ Worker explicitly rejected unhandled task type (TASK_ASSIGN does not equal ACCEPTED)`);
  } else {
    throw new Error('Test 9 failed: Worker should have rejected unsupported task');
  }

  // [Test 10 & 19] Worker Capacity Protection & Task Rejection
  console.log('\n[Test 10 & 19] Worker Capacity Protection');
  const busyWorker = new TaskWorkerRuntime(nodeBId, 1, 1);
  busyWorker.registerTaskHandler('slow-task', async () => new Promise((r) => setTimeout(r, 200)));

  const tA = taskMgrA.createTask({ type: 'slow-task', payload: {} });
  const tB = taskMgrA.createTask({ type: 'slow-task', payload: {} });

  // Start first task
  busyWorker.executeTask(tA);

  const capacityCheck = busyWorker.canAcceptTask(tB);
  if (!capacityCheck.canAccept && capacityCheck.reason?.includes('CAPACITY_EXCEEDED')) {
    console.log(`  ✔ Worker rejected second task when maxConcurrentTasks (1) exceeded`);
  } else {
    throw new Error('Test 10/19 failed: Capacity protection failed');
  }

  // [Test 11 & 13] Local Execution & Result Collection
  console.log('\n[Test 11 & 13] Local Task Execution & Result Collection');
  taskMgrA.getWorkerRuntime().registerTaskHandler('math-task', async (task) => {
    return { sum: task.payload.a + task.payload.b };
  });

  const mathTask = taskMgrA.createTask({
    type: 'math-task',
    payload: { a: 10, b: 32 }
  });

  const mathResult = await taskMgrA.submitTask<{ sum: number }>(mathTask);
  if (mathResult.status === 'COMPLETED' && mathResult.result?.sum === 42 && mathTask.state === TaskState.COMPLETED) {
    console.log(`  ✔ Task executed successfully to COMPLETED state. Result sum: 42`);
  } else {
    throw new Error('Test 11/13 failed: Local task execution failed');
  }

  // [Test 12] Progress Reporting
  console.log('\n[Test 12] Progress Reporting');
  const progressReported: number[] = [];
  taskMgrA.getWorkerRuntime().registerTaskHandler('progress-task', async (task, reportProgress) => {
    reportProgress(0.25, '25% done');
    reportProgress(0.75, '75% done');
    reportProgress(1.0, '100% done');
    return { done: true };
  });

  const progTask = taskMgrA.createTask({ type: 'progress-task', payload: {} });
  taskMgrA.onTaskProgress(progTask.taskId, (fraction) => {
    progressReported.push(fraction);
  });

  await taskMgrA.submitTask(progTask);
  if (progressReported.length === 3 && progressReported[0] === 0.25 && progressReported[2] === 1.0) {
    console.log(`  ✔ Received progress updates: ${progressReported.join(', ')}`);
  } else {
    throw new Error('Test 12 failed: Progress reporting failed');
  }

  // [Test 14 & 15] Lease Expiration & Reassignment Identity Preservation
  console.log('\n[Test 14 & 15] Lease Expiration & Reassignment Identity Preservation');
  const lease = recoveryMgr.grantLease(task1.taskId, 1, nodeBId, 10);
  await new Promise((r) => setTimeout(r, 25));

  if (recoveryMgr.isLeaseExpired(task1.taskId)) {
    console.log(`  ✔ Worker lease detected as EXPIRED after timeout`);
    const reassigned = recoveryMgr.prepareReassignment(task1, 3);
    if (reassigned.taskId === task1.taskId && reassigned.executionAttempt === 2) {
      console.log(`  ✔ Task reassigned for Attempt 2 maintaining identical taskId (${reassigned.taskId})`);
    }
  } else {
    throw new Error('Test 14 failed: Lease expiration failed');
  }

  // [Test 16] Duplicate Execution Protection (TaskExecutionRegistry)
  console.log('\n[Test 16] Duplicate Execution Protection');
  const execRegistry = new TaskExecutionRegistry();
  execRegistry.registerAttemptStart('aegis-task://dup-check', 1);

  try {
    execRegistry.registerAttemptStart('aegis-task://dup-check', 1);
    throw new Error('Test 16 failed: Should have thrown TASK_DUPLICATE_EXECUTION');
  } catch (err: any) {
    if (err.code === CoordinationErrorCode.TASK_DUPLICATE_EXECUTION) {
      console.log(`  ✔ Intercepted duplicate execution attempt: ${err.message}`);
    } else {
      throw err;
    }
  }

  // [Test 17] Task Cancellation
  console.log('\n[Test 17] Task Cancellation');
  const cancelTask = taskMgrA.createTask({ type: 'math-task', payload: { a: 1, b: 1 } });
  await taskMgrA.cancelTask(cancelTask.taskId);

  if (cancelTask.state === TaskState.CANCELLED) {
    console.log(`  ✔ Task state updated to CANCELLED cleanly`);
  } else {
    throw new Error('Test 17 failed: Task cancellation failed');
  }

  // [Test 18] Deadline Expiration
  console.log('\n[Test 18] Deadline Expiration');
  const expiredTask = taskMgrA.createTask({
    type: 'math-task',
    payload: { a: 1, b: 1 },
    deadline: Date.now() - 100 // Expired in past
  });

  try {
    await taskMgrA.submitTask(expiredTask);
    throw new Error('Test 18 failed: Should have rejected expired task');
  } catch (err: any) {
    if (err.code === CoordinationErrorCode.TASK_EXPIRED && expiredTask.state === TaskState.EXPIRED) {
      console.log(`  ✔ Rejected expired task and set state to EXPIRED`);
    } else {
      throw err;
    }
  }

  // [Test 20] Priority Scheduling
  console.log('\n[Test 20] Priority Scheduling Order');
  const lowTask = taskMgrA.createTask({ type: 't', payload: {}, priority: TaskPriority.LOW });
  const highTask = taskMgrA.createTask({ type: 't', payload: {}, priority: TaskPriority.HIGH });
  const criticalTask = taskMgrA.createTask({ type: 't', payload: {}, priority: TaskPriority.CRITICAL });

  const sorted = scheduler.sortTasksByPriority([lowTask, highTask, criticalTask]);
  if (sorted[0].priority === TaskPriority.CRITICAL && sorted[1].priority === TaskPriority.HIGH && sorted[2].priority === TaskPriority.LOW) {
    console.log(`  ✔ Tasks correctly sorted by priority: CRITICAL (0) -> HIGH (1) -> LOW (3)`);
  } else {
    throw new Error('Test 20 failed: Priority sorting failed');
  }

  console.log('\n============================================================');
  console.log('  ✔ ALL PHASE 4 DISTRIBUTED COORDINATION TESTS PASSED!');
  console.log('============================================================\n');
}

runPhase4TestSuite().catch((err) => {
  console.error('\n❌ PHASE 4 TEST SUITE FAILED:', err);
  process.exit(1);
});
