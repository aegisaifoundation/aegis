#pragma once
#include <cstdint>

namespace aegis::die::resource_manager {

struct ResourceStatistics {
  uint64_t snapshotsCollected = 0;
  uint64_t broadcastsSent = 0;
  uint64_t broadcastsReceived = 0;
  uint64_t syncFailures = 0;
};

} // namespace aegis::die::resource_manager
