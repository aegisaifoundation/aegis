#include "Orchestrator.hpp"

namespace aegis::air {

bool WorkflowEngine::runWorkflow(const AITask& rootTask) {
  TaskPlanner planner;
  TaskGraph graph = planner.plan(rootTask);
  return m_orchestrator->executeGraph(graph);
}

} // namespace aegis::air
