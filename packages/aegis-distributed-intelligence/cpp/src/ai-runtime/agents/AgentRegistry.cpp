#include "IAgent.hpp"

namespace aegis::air {

void AgentRegistry::registerAgent(std::shared_ptr<IAgent> agent) {
  if (!agent) return;
  std::lock_guard<std::mutex> lock(m_mutex);
  m_agents[agent->metadata().name] = agent;
}

void AgentRegistry::unregisterAgent(const std::string& name) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_agents.erase(name);
}

std::shared_ptr<IAgent> AgentRegistry::lookupAgent(const std::string& name) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_agents.find(name);
  if (it != m_agents.end()) {
    return it->second;
  }
  return nullptr;
}

std::vector<std::shared_ptr<IAgent>> AgentRegistry::searchByCapability(const std::string& capability) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<std::shared_ptr<IAgent>> results;
  for (const auto& [name, agent] : m_agents) {
    for (const auto& cap : agent->capabilities().capabilities) {
      if (cap == capability) {
        results.push_back(agent);
        break;
      }
    }
  }
  return results;
}

std::vector<std::shared_ptr<IAgent>> AgentRegistry::listAgents() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<std::shared_ptr<IAgent>> results;
  for (const auto& [name, agent] : m_agents) {
    results.push_back(agent);
  }
  return results;
}

} // namespace aegis::air
