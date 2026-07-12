#pragma once
#include "../state/NodeState.hpp"
#include <functional>
#include <mutex>
#include <vector>

namespace aegis::die::lifecycle {

class LifecycleManager {
public:
  using StateChangeCallback = std::function<void(state::NodeState, state::NodeState)>;

  LifecycleManager();

  state::NodeState getCurrentState() const;
  bool transitionTo(state::NodeState newState);
  void registerCallback(StateChangeCallback callback);

private:
  state::NodeState m_currentState;
  std::vector<StateChangeCallback> m_callbacks;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::lifecycle
