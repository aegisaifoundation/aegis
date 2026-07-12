#include "aegis/die/lifecycle/LifecycleManager.hpp"
#include "aegis/die/lifecycle/StateTransition.hpp"

namespace aegis::die::lifecycle {

LifecycleManager::LifecycleManager()
  : m_currentState(state::NodeState::BOOTING) {}

state::NodeState LifecycleManager::getCurrentState() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_currentState;
}

bool LifecycleManager::transitionTo(state::NodeState newState) {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (!StateTransition::isValidTransition(m_currentState, newState)) {
    return false;
  }
  
  state::NodeState oldState = m_currentState;
  m_currentState = newState;
  
  for (const auto& callback : m_callbacks) {
    if (callback) {
      callback(oldState, newState);
    }
  }
  return true;
}

void LifecycleManager::registerCallback(StateChangeCallback callback) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_callbacks.push_back(callback);
}

} // namespace aegis::die::lifecycle
