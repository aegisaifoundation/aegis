#pragma once
#include "DiscoveryPacket.hpp"
#include <functional>
#include <memory>

namespace aegis::die::discovery {

class DiscoveryProtocol {
public:
  using PacketCallback = std::function<void(const DiscoveryPacket&)>;

  virtual ~DiscoveryProtocol() = default;
  virtual void start() = 0;
  virtual void stop() = 0;
  virtual void broadcast(const DiscoveryPacket& packet) = 0;
  virtual void registerCallback(PacketCallback callback) = 0;
};

std::shared_ptr<DiscoveryProtocol> createDiscoveryProtocol();

} // namespace aegis::die::discovery
