#pragma once
#include "../tasks/DistributedTask.hpp"
#include "../scheduler/WorkerPool.hpp"
#include <functional>
#include <mutex>
#include <map>
#include <atomic>
#include <string>
#include <memory>

namespace aegis::die::execution {

using TaskExecutor = std::function<void(
    const tasks::DistributedTask& task,
    std::function<void(double progress, const std::string& partialOutput)> onProgress,
    std::function<void(const std::string& resultData, bool success, const std::string& error)> onComplete,
    std::atomic<bool>& cancelFlag
)>;

class WorkerRuntime {
public:
  explicit WorkerRuntime(size_t threads = 4);
  ~WorkerRuntime() = default;

  void registerExecutor(const std::string& taskType, TaskExecutor executor);
  
  void executeTask(const tasks::DistributedTask& task,
                   std::function<void(double progress, const std::string& partialOutput)> onProgress,
                   std::function<void(const std::string& resultData, bool success, const std::string& error)> onComplete);

  void cancelTask(const common::TaskID& taskId);
  bool isExecuting(const common::TaskID& taskId) const;

  void stop();

private:
  scheduler::WorkerPool m_pool;
  std::map<std::string, TaskExecutor> m_executors;
  std::map<common::TaskID, std::shared_ptr<std::atomic<bool>>> m_activeCancels;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::execution
