#pragma once
#include "../tasks/DistributedTask.hpp"
#include "../capabilities/NodeCapabilities.hpp"
#include "../health/NodeHealth.hpp"
#include <vector>
#include <map>
#include <string>

namespace aegis::die::scheduler {

class CapabilityScheduler {
public:
  CapabilityScheduler() = default;
  ~CapabilityScheduler() = default;

  double scoreNode(const tasks::DistributedTask& task, 
                   const capabilities::NodeCapabilities& caps, 
                   const health::NodeHealth& health) const;

  common::NodeID scheduleTask(const tasks::DistributedTask& task, 
                              const std::vector<capabilities::NodeCapabilities>& nodesCaps, 
                              const std::map<common::NodeID, health::NodeHealth>& healthMap) const;
};

} // namespace aegis::die::scheduler
