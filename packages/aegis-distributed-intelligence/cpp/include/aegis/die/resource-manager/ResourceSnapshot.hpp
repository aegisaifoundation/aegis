#pragma once
#include "../common/Types.hpp"
#include "../capabilities/NodeCapabilities.hpp"
#include "../resources/NodeResources.hpp"
#include "../health/NodeHealth.hpp"
#include "../statistics/NodeStatistics.hpp"
#include <string>

namespace aegis::die::resource_manager {

struct ResourceSnapshot {
  common::NodeID nodeId;
  common::Timestamp timestamp;
  capabilities::NodeCapabilities capabilities;
  resources::NodeResources resources;
  health::NodeHealth health;
  statistics::NodeStatistics stats;

  std::string toJson() const;
  bool fromJson(const std::string& jsonStr);
};

} // namespace aegis::die::resource_manager
