#pragma once
#include "../state/NodeState.hpp"
#include <string>

namespace aegis::die::lifecycle {

class StateTransition {
public:
  static bool isValidTransition(state::NodeState from, state::NodeState to);
  static std::string stateToString(state::NodeState state);
};

} // namespace aegis::die::lifecycle
