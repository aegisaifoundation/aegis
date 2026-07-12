#include "aegis/die/lifecycle/StateTransition.hpp"

namespace aegis::die::lifecycle {

bool StateTransition::isValidTransition(state::NodeState from, state::NodeState to) {
  using state::NodeState;
  
  if (from == to) return true;
  
  switch (from) {
    case NodeState::BOOTING:
      return to == NodeState::ONLINE || to == NodeState::OFFLINE || to == NodeState::SHUTDOWN;
    case NodeState::ONLINE:
      return to == NodeState::DISCOVERING || to == NodeState::CONNECTED || to == NodeState::OFFLINE || to == NodeState::SHUTDOWN;
    case NodeState::DISCOVERING:
      return to == NodeState::CONNECTED || to == NodeState::ONLINE || to == NodeState::OFFLINE;
    case NodeState::CONNECTED:
      return to == NodeState::SYNCING || to == NodeState::IDLE || to == NodeState::DISCOVERING || to == NodeState::OFFLINE;
    case NodeState::SYNCING:
      return to == NodeState::IDLE || to == NodeState::CONNECTED || to == NodeState::OFFLINE;
    case NodeState::IDLE:
      return to == NodeState::BUSY || to == NodeState::TRAINING || to == NodeState::INFERENCE || to == NodeState::CONNECTED || to == NodeState::OFFLINE;
    case NodeState::BUSY:
    case NodeState::TRAINING:
    case NodeState::INFERENCE:
      return to == NodeState::IDLE || to == NodeState::CONNECTED || to == NodeState::RECOVERING || to == NodeState::OFFLINE;
    case NodeState::RECOVERING:
      return to == NodeState::ONLINE || to == NodeState::OFFLINE || to == NodeState::SHUTDOWN;
    case NodeState::OFFLINE:
      return to == NodeState::BOOTING || to == NodeState::SHUTDOWN;
    case NodeState::SHUTDOWN:
      return false;
    default:
      return false;
  }
}

std::string StateTransition::stateToString(state::NodeState state) {
  using state::NodeState;
  switch (state) {
    case NodeState::BOOTING: return "BOOTING";
    case NodeState::ONLINE: return "ONLINE";
    case NodeState::DISCOVERING: return "DISCOVERING";
    case NodeState::CONNECTED: return "CONNECTED";
    case NodeState::SYNCING: return "SYNCING";
    case NodeState::IDLE: return "IDLE";
    case NodeState::BUSY: return "BUSY";
    case NodeState::TRAINING: return "TRAINING";
    case NodeState::INFERENCE: return "INFERENCE";
    case NodeState::RECOVERING: return "RECOVERING";
    case NodeState::OFFLINE: return "OFFLINE";
    case NodeState::SHUTDOWN: return "SHUTDOWN";
    default: return "UNKNOWN";
  }
}

} // namespace aegis::die::lifecycle
