#pragma once

namespace aegis::die::state {

enum class NodeState {
  BOOTING,
  ONLINE,
  DISCOVERING,
  CONNECTED,
  SYNCING,
  IDLE,
  BUSY,
  TRAINING,
  INFERENCE,
  RECOVERING,
  OFFLINE,
  SHUTDOWN
};

} // namespace aegis::die::state
