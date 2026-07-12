#pragma once

namespace aegis::die::runtime {

enum class RuntimeState {
  STARTING,
  INITIALIZING,
  DISCOVERING,
  ONLINE,
  BUSY,
  DEGRADED,
  RECOVERING,
  STOPPING,
  OFFLINE
};

} // namespace aegis::die::runtime
