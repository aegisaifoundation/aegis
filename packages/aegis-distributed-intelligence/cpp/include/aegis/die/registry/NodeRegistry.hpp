#pragma once
#include "../common/Types.hpp"
#include <memory>
#include <vector>

namespace aegis::die::node {
class NodeDescriptor;
}

namespace aegis::die::registry {

class NodeRegistry {
public:
  virtual ~NodeRegistry() = default;
  virtual void registerNode(std::shared_ptr<node::NodeDescriptor> descriptor) = 0;
  virtual void unregisterNode(const common::NodeID& nodeId) = 0;
  virtual std::shared_ptr<node::NodeDescriptor> getNode(const common::NodeID& nodeId) const = 0;
  virtual std::vector<std::shared_ptr<node::NodeDescriptor>> listNodes() const = 0;
};

std::shared_ptr<NodeRegistry> createNodeRegistry();

} // namespace aegis::die::registry
