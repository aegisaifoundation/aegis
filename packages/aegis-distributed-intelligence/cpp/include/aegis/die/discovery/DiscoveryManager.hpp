#pragma once
#include "DiscoveryProtocol.hpp"
#include <memory>

namespace aegis::die::discovery {

class DiscoveryManager {
public:
  virtual ~DiscoveryManager() = default;
  virtual void startDiscovery() = 0;
  virtual void stopDiscovery() = 0;
  virtual void registerProtocol(std::shared_ptr<DiscoveryProtocol> protocol) = 0;
};

std::shared_ptr<DiscoveryManager> createDiscoveryManager();

} // namespace aegis::die::discovery
