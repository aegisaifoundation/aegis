#include "IAgent.hpp"
#include "AgentBase.hpp"
#include "../tasks/AITask.hpp"
#include <iostream>

namespace aegis::air {

class PlannerAgent : public AgentBase {
public:
  explicit PlannerAgent(const AgentMetadata& meta) : AgentBase(meta) {}

  AgentResult execute(const AITask& task) override {
    std::cout << "[PlannerAgent] Executing task: " << task.taskId << " (" << task.goal << ")" << std::endl;
    AgentResult res;
    res.success = true;
    res.output = "Plan generated: Subtask 1: Setup environment, Subtask 2: Implement core service.";
    return res;
  }
};

class CoderAgent : public AgentBase {
public:
  explicit CoderAgent(const AgentMetadata& meta) : AgentBase(meta) {}

  AgentResult execute(const AITask& task) override {
    std::cout << "[CoderAgent] Executing task: " << task.taskId << " (" << task.goal << ")" << std::endl;
    AgentResult res;
    res.success = true;
    res.output = "Code written successfully in modern C++20.";
    return res;
  }
};

class ResearcherAgent : public AgentBase {
public:
  explicit ResearcherAgent(const AgentMetadata& meta) : AgentBase(meta) {}

  AgentResult execute(const AITask& task) override {
    std::cout << "[ResearcherAgent] Executing task: " << task.taskId << " (" << task.goal << ")" << std::endl;
    AgentResult res;
    res.success = true;
    res.output = "Research completed: Found 3 relevant peer-to-peer routing frameworks.";
    return res;
  }
};

std::shared_ptr<IAgent> AgentFactory::createAgent(const std::string& type, const std::string& name) {
  AgentMetadata meta;
  meta.name = name;
  meta.version = "1.0.0";
  meta.description = type + " agent for handling tasks.";
  
  if (type == "Planner") {
    meta.supportedTasks = {"planning"};
    return std::make_shared<PlannerAgent>(meta);
  } else if (type == "Coder") {
    meta.supportedTasks = {"coding"};
    return std::make_shared<CoderAgent>(meta);
  } else if (type == "Researcher") {
    meta.supportedTasks = {"research"};
    return std::make_shared<ResearcherAgent>(meta);
  }
  
  meta.supportedTasks = {"general"};
  return std::make_shared<PlannerAgent>(meta); // fallback
}

} // namespace aegis::air
