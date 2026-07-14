#pragma once
#include "RuntimeConfiguration.hpp"
#include <memory>
#include <string>

namespace aegis::die::kernel {
class KernelContext;
}

namespace aegis::die::registry {
class NodeRegistry;
class RoleRegistry;
class CapabilityRegistry;
class ResourceRegistry;
}

namespace aegis::die::communication {
class ICommunication;
}

namespace aegis::die::transport {
class ITransport;
}

namespace aegis::die::events {
class EventDispatcher;
}

namespace aegis::die::statistics {
struct NodeStatistics;
}

namespace aegis::die::execution {
class DistributedExecutionLayer;
}

namespace aegis::die::runtime {

class RuntimeContext {
public:
  virtual ~RuntimeContext() = default;
  
  virtual const RuntimeConfiguration& getRuntimeConfig() const = 0;
  virtual std::shared_ptr<kernel::KernelContext> getKernelContext() = 0;
  
  virtual std::shared_ptr<registry::NodeRegistry> getNodeRegistry() = 0;
  virtual std::shared_ptr<registry::RoleRegistry> getRoleRegistry() = 0;
  virtual std::shared_ptr<registry::CapabilityRegistry> getCapabilityRegistry() = 0;
  virtual std::shared_ptr<registry::ResourceRegistry> getResourceRegistry() = 0;
  
  virtual std::shared_ptr<execution::DistributedExecutionLayer> getExecutionLayer() = 0;
  
  virtual std::shared_ptr<communication::ICommunication> getCommunication() = 0;
  virtual std::shared_ptr<transport::ITransport> getTransport() = 0;
  virtual std::shared_ptr<events::EventDispatcher> getEventDispatcher() = 0;
  
  virtual std::shared_ptr<statistics::NodeStatistics> getStatistics() = 0;
  
  virtual void log(const std::string& level, const std::string& component, const std::string& message) = 0;
};

} // namespace aegis::die::runtime
