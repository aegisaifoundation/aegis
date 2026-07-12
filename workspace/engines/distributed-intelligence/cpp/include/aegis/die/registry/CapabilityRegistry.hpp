#pragma once
#include "../capabilities/NodeCapabilities.hpp"
#include "../common/Types.hpp"

namespace aegis::die::registry {

class CapabilityRegistry {
public:
  virtual ~CapabilityRegistry() = default;
  virtual void updateCapabilities(const common::NodeID& nodeId, const capabilities::NodeCapabilities& caps) = 0;
  virtual capabilities::NodeCapabilities getCapabilities(const common::NodeID& nodeId) const = 0;
};

std::shared_ptr<CapabilityRegistry> createCapabilityRegistry();

} // namespace aegis::die::registry
