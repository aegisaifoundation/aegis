#include "aegis/die/tasks/DistributedTaskQueue.hpp"
#include <fstream>
#include <chrono>
#include <iostream>
#include <algorithm>

namespace aegis::die::tasks {

static uint64_t current_time_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()).count();
}

DistributedTaskQueue::DistributedTaskQueue(QueueSchedulingMode mode)
  : m_mode(mode) {}

void DistributedTaskQueue::enqueue(const DistributedTask& task) {
  std::lock_guard<std::mutex> lock(m_mutex);
  // Ensure we don't insert duplicate task IDs
  auto it = std::find_if(m_tasks.begin(), m_tasks.end(), [&task](const DistributedTask& t) {
    return t.taskId == task.taskId;
  });
  if (it != m_tasks.end()) {
    *it = task;
  } else {
    m_tasks.push_back(task);
  }
}

bool DistributedTaskQueue::dequeue(DistributedTask& outTask) {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_tasks.empty()) return false;

  uint64_t now = current_time_ms();
  auto bestIt = m_tasks.end();

  for (auto it = m_tasks.begin(); it != m_tasks.end(); ++it) {
    // Only dequeue tasks that have reached their scheduled execution time and are PENDING
    if (it->scheduledTimeMs > now || it->currentState != "PENDING") {
      continue;
    }

    if (bestIt == m_tasks.end()) {
      bestIt = it;
      continue;
    }

    if (m_mode == QueueSchedulingMode::FIFO) {
      // FIFO chooses the older task
      // By default, tasks are appended to m_tasks, so earlier index is older.
      // Thus, the first executable task we find is the oldest.
      // We don't need to change bestIt.
    } else {
      // PRIORITY scheduling
      if (it->priority > bestIt->priority) {
        bestIt = it;
      } else if (it->priority == bestIt->priority) {
        // Tie-breaker 1: earlier deadline
        if (it->deadlineMs < bestIt->deadlineMs) {
          bestIt = it;
        }
      }
    }
  }

  if (bestIt != m_tasks.end()) {
    outTask = *bestIt;
    m_tasks.erase(bestIt);
    return true;
  }

  return false;
}

bool DistributedTaskQueue::cancelTask(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = std::find_if(m_tasks.begin(), m_tasks.end(), [&taskId](const DistributedTask& t) {
    return t.taskId == taskId;
  });
  if (it != m_tasks.end()) {
    it->currentState = "CANCELLED";
    return true;
  }
  return false;
}

bool DistributedTaskQueue::getTask(const common::TaskID& taskId, DistributedTask& outTask) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = std::find_if(m_tasks.begin(), m_tasks.end(), [&taskId](const DistributedTask& t) {
    return t.taskId == taskId;
  });
  if (it != m_tasks.end()) {
    outTask = *it;
    return true;
  }
  return false;
}

void DistributedTaskQueue::updateTaskState(const common::TaskID& taskId, const std::string& state, double progress) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = std::find_if(m_tasks.begin(), m_tasks.end(), [&taskId](const DistributedTask& t) {
    return t.taskId == taskId;
  });
  if (it != m_tasks.end()) {
    it->currentState = state;
    if (progress >= 0.0) {
      it->progress = progress;
    }
  }
}

void DistributedTaskQueue::persist(const std::string& filePath) {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::ofstream out(filePath);
  if (!out) return;
  for (const auto& task : m_tasks) {
    out << task.toJson() << "\n";
  }
}

void DistributedTaskQueue::recover(const std::string& filePath) {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::ifstream in(filePath);
  if (!in) return;
  m_tasks.clear();
  std::string line;
  while (std::getline(in, line)) {
    if (line.empty()) continue;
    DistributedTask task;
    if (task.fromJson(line)) {
      m_tasks.push_back(task);
    }
  }
}

size_t DistributedTaskQueue::size() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_tasks.size();
}

size_t DistributedTaskQueue::pendingCount() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  size_t count = 0;
  for (const auto& t : m_tasks) {
    if (t.currentState == "PENDING") {
      count++;
    }
  }
  return count;
}

std::vector<DistributedTask> DistributedTaskQueue::listTasks() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_tasks;
}

} // namespace aegis::die::tasks
