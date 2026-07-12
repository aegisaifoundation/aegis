#include "IAgent.hpp"

namespace aegis::air {

void AgentLifecycleManager::initializeAgent(std::shared_ptr<IAgent> agent) {
  if (agent) {
    agent->initialize();
  }
}

void AgentLifecycleManager::startAgent(std::shared_ptr<IAgent> agent) {
  if (agent) {
    agent->start();
  }
}

void AgentLifecycleManager::stopAgent(std::shared_ptr<IAgent> agent) {
  if (agent) {
    agent->stop();
  }
}

HealthReport AgentLifecycleManager::checkAgentHealth(std::shared_ptr<IAgent> agent) {
  if (agent) {
    return agent->health();
  }
  HealthReport hr;
  hr.status = "DEAD";
  hr.details = "Agent pointer is null";
  return hr;
}

} // namespace aegis::air
