#include "aegis/die/discovery/DiscoveryManager.hpp"
#include "aegis/die/discovery/DiscoveryProtocol.hpp"
#include <vector>
#include <mutex>
#include <atomic>

namespace aegis::die::discovery {

class DiscoveryProtocolImpl : public DiscoveryProtocol {
public:
  void start() override { m_active = true; }
  void stop() override { m_active = false; }
  
  void broadcast(const DiscoveryPacket& packet) override {
    if (m_active && m_callback) {
      m_callback(packet);
    }
  }

  void registerCallback(PacketCallback callback) override {
    m_callback = callback;
  }

private:
  PacketCallback m_callback;
  std::atomic<bool> m_active{false};
};

class DiscoveryManagerImpl : public DiscoveryManager {
public:
  void startDiscovery() override {
    for (const auto& proto : m_protocols) {
      proto->start();
    }
  }

  void stopDiscovery() override {
    for (const auto& proto : m_protocols) {
      proto->stop();
    }
  }

  void registerProtocol(std::shared_ptr<DiscoveryProtocol> protocol) override {
    m_protocols.push_back(protocol);
  }

private:
  std::vector<std::shared_ptr<DiscoveryProtocol>> m_protocols;
};

std::shared_ptr<DiscoveryProtocol> createDiscoveryProtocol() {
  return std::make_shared<DiscoveryProtocolImpl>();
}
std::shared_ptr<DiscoveryManager> createDiscoveryManager() {
  return std::make_shared<DiscoveryManagerImpl>();
}

} // namespace aegis::die::discovery
