#include "AITask.hpp"
#include <algorithm>

namespace aegis::air {

void TaskGraph::addTask(const AITask& task) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_tasks[task.taskId] = task;
  if (m_inDegree.find(task.taskId) == m_inDegree.end()) {
    m_inDegree[task.taskId] = 0;
  }
}

void TaskGraph::addDependency(const std::string& fromId, const std::string& toId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_adj[fromId].push_back(toId);
  m_inDegree[toId]++;
}

std::vector<AITask> TaskGraph::getReadyTasks() {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<AITask> ready;
  for (const auto& [id, task] : m_tasks) {
    // Task is not completed and inDegree is 0
    bool isDone = std::find(m_completed.begin(), m_completed.end(), id) != m_completed.end();
    if (!isDone && m_inDegree[id] == 0) {
      ready.push_back(task);
    }
  }
  return ready;
}

void TaskGraph::markCompleted(const std::string& taskId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  bool isDone = std::find(m_completed.begin(), m_completed.end(), taskId) != m_completed.end();
  if (isDone) return;

  m_completed.push_back(taskId);
  auto it = m_adj.find(taskId);
  if (it != m_adj.end()) {
    for (const auto& nextId : it->second) {
      if (m_inDegree[nextId] > 0) {
        m_inDegree[nextId]--;
      }
    }
  }
}

bool TaskGraph::isCompleted() {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_completed.size() == m_tasks.size();
}

std::vector<AITask> TaskGraph::listAllTasks() {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<AITask> all;
  for (const auto& [id, task] : m_tasks) {
    all.push_back(task);
  }
  return all;
}

} // namespace aegis::air
