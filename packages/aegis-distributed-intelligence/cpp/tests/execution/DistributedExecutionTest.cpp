#include "../TestHelper.hpp"
#include "aegis/die/runtime/DistributedRuntime.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/registry/CapabilityRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include "aegis/die/tasks/DistributedTask.hpp"
#include "aegis/die/execution/DistributedExecutionLayer.hpp"
#include "aegis/die/execution/DistributedExecutionService.hpp"
#include "aegis/die/execution/CheckpointManager.hpp"
#include "aegis/die/execution/ResultManager.hpp"
#include <thread>
#include <chrono>
#include <iostream>

DIE_TEST(DistributedExecutionLayerTest) {
  using namespace aegis::die::runtime;
  using namespace aegis::die::node;
  using namespace aegis::die::tasks;
  using namespace aegis::die::execution;
  using namespace aegis::die::common;

  std::cout << "\n=======================================================" << std::endl;
  std::cout << "TEST: Distributed Execution Layer Orchestration & Failover" << std::endl;
  std::cout << "=======================================================" << std::endl;

  // 1. Configure and Boot Runtime Node A and Node B
  RuntimeConfiguration configA;
  configA.node.nodeName = "Runtime-A";
  configA.transport.port = 9010;

  RuntimeConfiguration configB;
  configB.node.nodeName = "Runtime-B";
  configB.transport.port = 9011;

  DistributedRuntime rtA(configA);
  DistributedRuntime rtB(configB);

  std::cout << "[Test] Booting Runtime A..." << std::endl;
  rtA.boot();
  std::cout << "[Test] Booting Runtime B..." << std::endl;
  rtB.boot();

  auto ctxA = rtA.getContext();
  auto ctxB = rtB.getContext();

  // 2. Discover / Register Nodes
  auto descA = std::make_shared<NodeDescriptor>();
  descA->identity.id = "Runtime-A";
  descA->metadata.labels.items["address"] = "127.0.0.1:9010";
  descA->health.lastContact = aegis::die::common::now();
  descA->health.healthScore = 100;
  descA->health.statusSummary = "HEALTHY";

  auto descB = std::make_shared<NodeDescriptor>();
  descB->identity.id = "Runtime-B";
  descB->metadata.labels.items["address"] = "127.0.0.1:9011";
  descB->health.lastContact = aegis::die::common::now();
  descB->health.healthScore = 100;
  descB->health.statusSummary = "HEALTHY";

  ctxA->getNodeRegistry()->registerNode(descB);
  ctxB->getNodeRegistry()->registerNode(descA);

  std::cout << "✔ Nodes registered in respective NodeRegistries." << std::endl;

  // 3. Exchanging / Updating capabilities
  // Runtime-A has low CPU and no GPU
  aegis::die::capabilities::NodeCapabilities capsA;
  capsA.nodeId = "Runtime-A";
  capsA.cpuCores = 2;
  capsA.gpuAvailable = false;
  capsA.trustLevel = 1.0;
  capsA.cpuUtilization = 10.0;
  capsA.ramUtilization = 15.0;

  // Runtime-B has high CPU, RTX 4090 GPU, and is highly capable
  aegis::die::capabilities::NodeCapabilities capsB;
  capsB.nodeId = "Runtime-B";
  capsB.cpuCores = 8;
  capsB.gpuAvailable = true;
  capsB.gpuModel = "NVIDIA GeForce RTX 4090";
  capsB.cudaSupported = true;
  capsB.trustLevel = 1.0;
  capsB.cpuUtilization = 5.0;
  capsB.ramUtilization = 20.0;

  ctxA->getCapabilityRegistry()->updateCapabilities("Runtime-B", capsB);
  ctxB->getCapabilityRegistry()->updateCapabilities("Runtime-A", capsA);

  std::cout << "✔ Capabilities updated & exchanged." << std::endl;

  // 4. Submit a DistributedTask that requires GPU
  // The scheduler should route this task to Runtime-B
  DistributedTask task1;
  task1.taskId = "task-gpu-workload";
  task1.requiredResources.gpuRequired = true;
  task1.priority = 10;
  task1.retryPolicy.maxRetries = 2;
  task1.payload = "GPU execution run";

  std::cout << "[Test] Submitting GPU task on Node A..." << std::endl;
  
  std::vector<std::string> streamedProgress;
  ctxA->getExecutionLayer()->getResultManager()->registerStreamingCallback(task1.taskId, [&streamedProgress](const std::string& partial) {
    std::cout << "  [Node A Stream Callback]: " << partial << std::endl;
    streamedProgress.push_back(partial);
  });

  ctxA->getExecutionLayer()->submitTask(task1);

  // Allow dispatcher thread to pick up the task and run B's worker
  std::this_thread::sleep_for(std::chrono::milliseconds(1200));

  // Verify that the task completed on Node B, and result streamed back to Node A
  TaskResult res1;
  bool hasResult = ctxA->getExecutionLayer()->getTaskResult(task1.taskId, res1);
  
  DIE_ASSERT(hasResult);
  std::cout << "✔ Task Result Status: " << (res1.success ? "SUCCESS" : "FAILED") << std::endl;
  std::cout << "✔ Output: " << res1.resultData << std::endl;
  DIE_ASSERT(res1.success == true);
  DIE_ASSERT(!streamedProgress.empty());
  std::cout << "✔ Progress updates successfully streamed." << std::endl;

  // 5. Test Node Failure Recovery
  // Submit a second task to Node A destined for Node B
  DistributedTask task2;
  task2.taskId = "task-failover-workload";
  task2.taskType = "failover";
  task2.requiredResources.gpuRequired = true;
  task2.priority = 5;
  task2.retryPolicy.maxRetries = 1;
  task2.payload = "Failure recovery run";

  // Register failover executor on Node B that runs slowly
  std::static_pointer_cast<DistributedExecutionService>(ctxB->getExecutionLayer())->getWorkerRuntime().registerExecutor("failover", 
    [](const DistributedTask&, std::function<void(double, const std::string&)> onProgress, std::function<void(const std::string&, bool, const std::string&)> onComplete, std::atomic<bool>& cancel) {
      for (int i = 0; i < 50; ++i) {
        if (cancel.load()) return;
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
      }
      onComplete("Finished on B", true, "");
    }
  );

  // Register failover executor on Node A that completes immediately (run during recovery)
  std::static_pointer_cast<DistributedExecutionService>(ctxA->getExecutionLayer())->getWorkerRuntime().registerExecutor("failover", 
    [](const DistributedTask&, std::function<void(double, const std::string&)> onProgress, std::function<void(const std::string&, bool, const std::string&)> onComplete, std::atomic<bool>& cancel) {
      onComplete("Recovered locally!", true, "");
    }
  );

  // Save a mock checkpoint for task2 on Node A
  Checkpoint cp;
  cp.taskId = task2.taskId;
  cp.checkpointId = "cp-v1";
  cp.stateData = "Partial task state recovered";
  ctxA->getExecutionLayer()->saveCheckpoint(cp);

  std::cout << "[Test] Submitting failover task on Node A..." << std::endl;
  ctxA->getExecutionLayer()->submitTask(task2);

  // Let Node A dispatch it to Node B
  std::this_thread::sleep_for(std::chrono::milliseconds(200));

  // Simulate Node B going offline by setting health contact time to > 3 seconds ago
  std::cout << "[Test] Simulating Node B network partition/crash..." << std::endl;
  auto nodeBDesc = ctxA->getNodeRegistry()->getNode("Runtime-B");
  if (nodeBDesc) {
    nodeBDesc->health.lastContact = aegis::die::common::now() - std::chrono::seconds(5);
  }

  // Allow monitor thread to detect the offline node, recover the task, re-assign, and execute
  // Note: Since Runtime-B is offline, Node A's scheduler will falls back to Node A (even without GPU if it's the only node left)
  // Let's modify Node A's capability to allow executing task2 during fallback recovery
  capsA.gpuAvailable = true; // Pretend Node A now has GPU to allow execution
  ctxA->getCapabilityRegistry()->updateCapabilities("Runtime-A", capsA);

  std::this_thread::sleep_for(std::chrono::milliseconds(2500));

  // Verify task2 gets recovered and completes successfully
  TaskResult res2;
  bool recoveredResult = ctxA->getExecutionLayer()->getTaskResult(task2.taskId, res2);

  DIE_ASSERT(recoveredResult);
  std::cout << "✔ Failover Task Status: " << (res2.success ? "SUCCESS" : "FAILED") << std::endl;
  std::cout << "✔ Failover Output: " << res2.resultData << std::endl;
  DIE_ASSERT(res2.success == true);

  // Check metrics
  ExecutionMetrics metrics = ctxA->getExecutionLayer()->getMetrics();
  std::cout << "✔ Node A Stats: Completed: " << metrics.completedTasksCount << ", Retries: " << metrics.retryCount << std::endl;
  DIE_ASSERT(metrics.completedTasksCount >= 2);
  DIE_ASSERT(metrics.retryCount >= 1);

  std::cout << "[Test] Shutting down Runtimes..." << std::endl;
  rtA.shutdown();
  rtB.shutdown();

  std::cout << "🎉 DISTRIBUTED EXECUTION LAYER TEST PASSED SUCCESSFULLY! 🎉\n" << std::endl;
}
