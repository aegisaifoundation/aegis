#pragma once
#include "DistributedExecutionLayer.hpp"
#include "../lifecycle/IService.hpp"
#include "../tasks/DistributedTaskQueue.hpp"
#include "../scheduler/CapabilityScheduler.hpp"
#include "WorkerRuntime.hpp"
#include "CheckpointManager.hpp"
#include "ResultManager.hpp"
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <string>

namespace aegis::die::runtime { class RuntimeContext; }

namespace aegis::die::execution {

class DistributedExecutionService : 
    public aegis::die::lifecycle::IService, 
    public DistributedExecutionLayer,
    public std::enable_shared_from_this<DistributedExecutionService> {
public:
  explicit DistributedExecutionService(std::shared_ptr<runtime::RuntimeContext> ctx);
  virtual ~DistributedExecutionService();

  // IService interface
  void initialize() override;
  void start() override;
  void stop() override;
  void shutdown() override;
  std::string health() override;
  std::string statistics() override;

  // DistributedExecutionLayer interface
  void submitTask(const tasks::DistributedTask& task) override;
  void cancelTask(const common::TaskID& taskId) override;
  void pauseTask(const common::TaskID& taskId) override;
  void resumeTask(const common::TaskID& taskId) override;
  
  std::string getTaskStatus(const common::TaskID& taskId) override;
  bool getTaskResult(const common::TaskID& taskId, TaskResult& outResult) override;
  
  capabilities::NodeCapabilities getNodeCapabilities(const common::NodeID& nodeId) const override;

  void saveCheckpoint(const Checkpoint& cp) override;
  bool getLatestCheckpoint(const common::TaskID& taskId, Checkpoint& outCp) const override;

  std::shared_ptr<ResultManager> getResultManager() override { return m_resultManager; }
  ExecutionMetrics getMetrics() override;

  // Internal APIs
  WorkerRuntime& getWorkerRuntime() { return m_workerRuntime; }
  void broadcastCapabilities();

private:
  void runDispatcher();
  void runMonitor();
  void handleMessage(const std::string& sender, const std::string& payload);
  void executeLocalTask(const tasks::DistributedTask& task);
  void dispatchRemoteTask(const tasks::DistributedTask& task, const common::NodeID& targetNode);
  void recoverFailedTask(const tasks::DistributedTask& task);

  std::shared_ptr<runtime::RuntimeContext> m_ctx;
  tasks::DistributedTaskQueue m_queue;
  scheduler::CapabilityScheduler m_scheduler;
  WorkerRuntime m_workerRuntime;
  CheckpointManager m_checkpointManager;
  std::shared_ptr<ResultManager> m_resultManager;
  capabilities::NodeCapabilities m_localCapabilities;

  // Active / executing tasks on this node
  std::map<common::TaskID, tasks::DistributedTask> m_executingTasks;
  mutable std::mutex m_tasksMutex;

  std::thread m_dispatcherThread;
  std::thread m_monitorThread;
  std::atomic<bool> m_running{false};

  // Metrics
  std::atomic<uint64_t> m_completedCount{0};
  std::atomic<uint64_t> m_failureCount{0};
  std::atomic<uint64_t> m_retryCount{0};
  uint64_t m_networkTrafficBytes{0};
  mutable std::mutex m_metricsMutex;
};

} // namespace aegis::die::execution
