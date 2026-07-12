#include "Orchestrator.hpp"
#include <iostream>

namespace aegis::air {

bool AgentOrchestrator::executeGraph(TaskGraph& graph) {
  std::cout << "[AgentOrchestrator] Starting execution of task graph..." << std::endl;
  
  int loopLimit = 100; // prevent infinite loops in cycles
  while (!graph.isCompleted() && loopLimit-- > 0) {
    auto readyTasks = graph.getReadyTasks();
    if (readyTasks.empty()) {
      break;
    }
    
    for (const auto& task : readyTasks) {
      std::string location = m_scheduler->getExecutionLocation(task);
      std::cout << "[AgentOrchestrator] Task " << task.taskId << " routed to node: " << location << std::endl;
      
      // Determine required capability
      std::string reqCap = task.requiredCapabilities.empty() ? "general" : task.requiredCapabilities[0];
      
      // Lookup agent in registry
      auto agents = m_registry->searchByCapability(reqCap);
      std::shared_ptr<IAgent> selectedAgent;
      if (!agents.empty()) {
        selectedAgent = agents[0];
      } else {
        auto all = m_registry->listAgents();
        if (!all.empty()) {
          selectedAgent = all[0];
        }
      }
      
      AgentResult result;
      if (selectedAgent) {
        std::cout << "[AgentOrchestrator] Executing task locally using agent: " << selectedAgent->metadata().name << std::endl;
        result = selectedAgent->execute(task);
      } else {
        result.success = false;
        result.error = "No suitable agent registered for capability: " + reqCap;
      }
      
      m_aggregator.addResult(task.taskId, result);
      graph.markCompleted(task.taskId);
    }
  }
  
  return graph.isCompleted();
}

} // namespace aegis::air
