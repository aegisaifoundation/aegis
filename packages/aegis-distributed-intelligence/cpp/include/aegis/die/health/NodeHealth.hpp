#pragma once
#include "../common/Types.hpp"
#include <string>

namespace aegis::die::health {

struct NodeHealth {
  common::Timestamp lastHeartbeat = common::now();
  int healthScore = 100;
  double latencyMs = 0.0;
  common::Percentage packetLoss = 0.0;
  uint64_t failureCount = 0;
  double averageResponseTimeMs = 0.0;
  uint64_t uptimeSeconds = 0;
  common::Timestamp lastContact = common::now();
  std::string statusSummary = "HEALTHY";
};

} // namespace aegis::die::health
