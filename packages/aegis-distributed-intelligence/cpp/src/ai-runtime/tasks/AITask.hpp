#pragma once
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <memory>

namespace aegis::die::runtime { class RuntimeContext; }

namespace aegis::air {

enum class TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
};

enum class PrivacyLevel {
  PUBLIC = 0,
  CONFIDENTIAL = 1,
  PRIVATE = 2
};

struct AITask {
  std::string taskId;
  std::string parentTaskId;
  std::string goal;
  std::string description;
  std::string context;
  std::vector<std::string> constraints;
  TaskPriority priority = TaskPriority::MEDIUM;
  std::string deadline;
  PrivacyLevel privacy = PrivacyLevel::CONFIDENTIAL;
  std::vector<std::string> requiredCapabilities;
  std::string preferredModel;
  std::vector<std::string> requiredTools;
  std::vector<std::string> dependencies;
  std::unordered_map<std::string, std::string> metadata;
  std::vector<AITask> subtasks;
};

class TaskGraph {
public:
  TaskGraph() = default;
  TaskGraph(TaskGraph&& other) noexcept {
    std::lock_guard<std::mutex> lock(other.m_mutex);
    m_tasks = std::move(other.m_tasks);
    m_adj = std::move(other.m_adj);
    m_inDegree = std::move(other.m_inDegree);
    m_completed = std::move(other.m_completed);
  }
  void addTask(const AITask& task);
  void addDependency(const std::string& fromId, const std::string& toId);
  std::vector<AITask> getReadyTasks();
  void markCompleted(const std::string& taskId);
  bool isCompleted();
  std::vector<AITask> listAllTasks();
private:
  std::mutex m_mutex;
  std::unordered_map<std::string, AITask> m_tasks;
  std::unordered_map<std::string, std::vector<std::string>> m_adj;
  std::unordered_map<std::string, int> m_inDegree;
  std::vector<std::string> m_completed;
};

class TaskPlanner {
public:
  TaskPlanner() = default;
  TaskGraph plan(const AITask& rootTask);
};

class TaskSchedulerAdapter {
public:
  TaskSchedulerAdapter() = default;
  void setContext(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx) { m_ctx = ctx; }
  std::string getExecutionLocation(const AITask& task);
private:
  std::shared_ptr<aegis::die::runtime::RuntimeContext> m_ctx;
};

} // namespace aegis::air
