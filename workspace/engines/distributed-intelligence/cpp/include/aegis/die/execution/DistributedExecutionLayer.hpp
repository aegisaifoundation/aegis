#pragma once
#include "../tasks/DistributedTask.hpp"
#include "../capabilities/NodeCapabilities.hpp"
#include "CheckpointManager.hpp"
#include "ResultManager.hpp"
#include <string>
#include <memory>

namespace aegis::die::execution {

struct ExecutionMetrics {
  uint64_t queueLength = 0;
  double averageWaitTimeMs = 0.0;
  double schedulerLatencyMs = 0.0;
  double taskDurationMs = 0.0;
  double workerUtilization = 0.0;
  double cpuUsage = 0.0;
  double gpuUsage = 0.0;
  uint64_t memoryUsageBytes = 0;
  uint64_t networkTrafficBytes = 0;
  uint64_t failureRate = 0;
  uint64_t retryCount = 0;
  uint64_t completedTasksCount = 0;
};

class DistributedExecutionLayer {
public:
  virtual ~DistributedExecutionLayer() = default;

  // Task APIs
  virtual void submitTask(const tasks::DistributedTask& task) = 0;
  virtual void cancelTask(const common::TaskID& taskId) = 0;
  virtual void pauseTask(const common::TaskID& taskId) = 0;
  virtual void resumeTask(const common::TaskID& taskId) = 0;
  
  virtual std::string getTaskStatus(const common::TaskID& taskId) = 0;
  virtual bool getTaskResult(const common::TaskID& taskId, TaskResult& outResult) = 0;
  
  // Capabilities API
  virtual capabilities::NodeCapabilities getNodeCapabilities(const common::NodeID& nodeId) const = 0;

  // Checkpoint API
  virtual void saveCheckpoint(const Checkpoint& cp) = 0;
  virtual bool getLatestCheckpoint(const common::TaskID& taskId, Checkpoint& outCp) const = 0;

  // Result Manager API (for registering callbacks)
  virtual std::shared_ptr<ResultManager> getResultManager() = 0;

  // Metrics API
  virtual ExecutionMetrics getMetrics() = 0;
};

} // namespace aegis::die::execution
