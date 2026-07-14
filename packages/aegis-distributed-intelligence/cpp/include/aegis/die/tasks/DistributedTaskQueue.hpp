#pragma once
#include "DistributedTask.hpp"
#include <vector>
#include <mutex>
#include <string>

namespace aegis::die::tasks {

enum class QueueSchedulingMode {
  FIFO,
  PRIORITY
};

class DistributedTaskQueue {
public:
  explicit DistributedTaskQueue(QueueSchedulingMode mode = QueueSchedulingMode::PRIORITY);
  ~DistributedTaskQueue() = default;

  void enqueue(const DistributedTask& task);
  bool dequeue(DistributedTask& outTask);
  bool cancelTask(const common::TaskID& taskId);
  
  bool getTask(const common::TaskID& taskId, DistributedTask& outTask) const;
  void updateTaskState(const common::TaskID& taskId, const std::string& state, double progress = -1.0);
  
  void persist(const std::string& filePath);
  void recover(const std::string& filePath);

  size_t size() const;
  size_t pendingCount() const;
  std::vector<DistributedTask> listTasks() const;

private:
  QueueSchedulingMode m_mode;
  std::vector<DistributedTask> m_tasks;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::tasks
