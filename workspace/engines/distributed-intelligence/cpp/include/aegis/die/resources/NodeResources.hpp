#pragma once
#include <string>
#include <vector>
#include "../common/Types.hpp"

namespace aegis::die::resources {

struct NodeResources {
  common::Percentage cpuUsage = 0.0;
  common::Percentage gpuUsage = 0.0;
  common::ByteSize memoryUsage = 0;
  common::ByteSize storageUsage = 0;
  
  double bandwidthIn = 0.0;
  double bandwidthOut = 0.0;
  double latency = 0.0;
  
  common::Percentage batteryLevel = 100.0;
  double temperature = 0.0;
  std::string powerSource = "AC";
  
  int currentRunningJobs = 0;
  int queueLength = 0;
};

} // namespace aegis::die::resources
