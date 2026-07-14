#include "aegis/die/execution/WorkerRuntime.hpp"
#include <chrono>
#include <thread>
#include <iostream>

namespace aegis::die::execution {

WorkerRuntime::WorkerRuntime(size_t threads)
  : m_pool(threads) {}

void WorkerRuntime::registerExecutor(const std::string& taskType, TaskExecutor executor) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_executors[taskType] = executor;
}

void WorkerRuntime::executeTask(const tasks::DistributedTask& task,
                   std::function<void(double progress, const std::string& partialOutput)> onProgress,
                   std::function<void(const std::string& resultData, bool success, const std::string& error)> onComplete) {
  
  auto cancelFlag = std::make_shared<std::atomic<bool>>(false);
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_activeCancels[task.taskId] = cancelFlag;
  }

  m_pool.enqueue([this, task, cancelFlag, onProgress, onComplete]() {
    TaskExecutor executor = nullptr;
    {
      std::lock_guard<std::mutex> lock(m_mutex);
      auto it = m_executors.find(task.taskType);
      if (it != m_executors.end()) {
        executor = it->second;
      }
    }

    if (executor) {
      try {
        executor(task, onProgress, onComplete, *cancelFlag);
      } catch (const std::exception& e) {
        onComplete("", false, std::string("Exception: ") + e.what());
      } catch (...) {
        onComplete("", false, "Unknown exception during execution");
      }
    } else {
      // Default / mock executor: simulate progress and complete task
      // This allows the system to demonstrate execution without any registered service.
      onProgress(10.0, "Started mock task execution");
      for (int i = 2; i <= 10; ++i) {
        if (cancelFlag->load()) {
          onComplete("", false, "Cancelled");
          // Clean up cancel flag
          {
            std::lock_guard<std::mutex> lock(m_mutex);
            m_activeCancels.erase(task.taskId);
          }
          return;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
        onProgress(i * 10.0, std::string("Task progress: ") + std::to_string(i * 10) + "%");
      }
      onComplete(std::string("Mock execution output for task ") + task.taskId, true, "");
    }

    // Clean up cancel flag
    {
      std::lock_guard<std::mutex> lock(m_mutex);
      m_activeCancels.erase(task.taskId);
    }
  });
}

void WorkerRuntime::cancelTask(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_activeCancels.find(taskId);
  if (it != m_activeCancels.end()) {
    it->second->store(true);
  }
}

bool WorkerRuntime::isExecuting(const common::TaskID& taskId) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_activeCancels.find(taskId) != m_activeCancels.end();
}

void WorkerRuntime::stop() {
  m_pool.stop();
  std::lock_guard<std::mutex> lock(m_mutex);
  for (auto& [id, cancel] : m_activeCancels) {
    cancel->store(true);
  }
  m_activeCancels.clear();
}

} // namespace aegis::die::execution
