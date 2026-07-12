#pragma once
#include <cstdint>

namespace aegis::die::statistics {

struct NodeStatistics {
  uint64_t trainingCount = 0;
  uint64_t inferenceCount = 0;
  uint64_t messagesSent = 0;
  uint64_t messagesReceived = 0;
  uint64_t bandwidthConsumedBytes = 0;
  uint64_t uptimeSeconds = 0;
  uint64_t failureCount = 0;
  uint64_t recoveryCount = 0;
  uint64_t tasksCompleted = 0;
};

} // namespace aegis::die::statistics
