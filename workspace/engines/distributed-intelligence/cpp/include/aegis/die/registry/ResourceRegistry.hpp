#pragma once
#include "../resources/NodeResources.hpp"
#include "../common/Types.hpp"

namespace aegis::die::registry {

class ResourceRegistry {
public:
  virtual ~ResourceRegistry() = default;
  virtual void updateResources(const common::NodeID& nodeId, const resources::NodeResources& res) = 0;
  virtual resources::NodeResources getResources(const common::NodeID& nodeId) const = 0;
};

std::shared_ptr<ResourceRegistry> createResourceRegistry();

} // namespace aegis::die::registry
