#include "aegis/die/resource-manager/ResourcePublisher.hpp"

namespace aegis::die::resource_manager {

ResourcePublisher::ResourcePublisher(std::shared_ptr<transport::ITransport> transport)
  : m_transport(transport) {}

void ResourcePublisher::broadcastSnapshot(const ResourceSnapshot& snapshot, const std::vector<std::string>& peerDestinations) {
  if (!m_transport) return;
  
  std::string payload = snapshot.toJson();
  
  std::lock_guard<std::mutex> lock(m_mutex);
  for (const auto& peer : peerDestinations) {
    m_transport->send(peer, payload);
  }
}

} // namespace aegis::die::resource_manager
