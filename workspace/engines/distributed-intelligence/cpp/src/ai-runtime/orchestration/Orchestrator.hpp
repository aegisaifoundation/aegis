#pragma once
#include "../tasks/AITask.hpp"
#include "../agents/IAgent.hpp"
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>

namespace aegis::air {

class ResultAggregator {
public:
  ResultAggregator() = default;
  void addResult(const std::string& taskId, const AgentResult& result);
  std::string getCombinedOutput() const;
private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, AgentResult> m_results;
};

class AgentOrchestrator {
public:
  AgentOrchestrator(std::shared_ptr<AgentRegistry> registry, std::shared_ptr<TaskSchedulerAdapter> scheduler)
    : m_registry(registry), m_scheduler(scheduler) {}

  bool executeGraph(TaskGraph& graph);
  std::string getFinalResult() const { return m_aggregator.getCombinedOutput(); }
private:
  std::shared_ptr<AgentRegistry> m_registry;
  std::shared_ptr<TaskSchedulerAdapter> m_scheduler;
  ResultAggregator m_aggregator;
};

class WorkflowEngine {
public:
  WorkflowEngine(std::shared_ptr<AgentOrchestrator> orchestrator)
    : m_orchestrator(orchestrator) {}

  bool runWorkflow(const AITask& rootTask);
private:
  std::shared_ptr<AgentOrchestrator> m_orchestrator;
};

} // namespace aegis::air
