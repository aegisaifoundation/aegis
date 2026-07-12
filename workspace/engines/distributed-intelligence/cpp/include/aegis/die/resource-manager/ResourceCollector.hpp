#pragma once
#include "../resources/NodeResources.hpp"
#include <memory>

namespace aegis::die::resource_manager {

class ResourceCollector {
public:
  virtual ~ResourceCollector() = default;
  virtual resources::NodeResources collect() = 0;
};

std::shared_ptr<ResourceCollector> createResourceCollector();

} // namespace aegis::die::resource_manager
