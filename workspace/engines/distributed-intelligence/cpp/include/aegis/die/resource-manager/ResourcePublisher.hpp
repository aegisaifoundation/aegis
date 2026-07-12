#pragma once
#include "ResourceSnapshot.hpp"
#include "../transport/ITransport.hpp"
#include <memory>
#include <vector>
#include <string>
#include <mutex>

namespace aegis::die::resource_manager {

class ResourcePublisher {
public:
  ResourcePublisher(std::shared_ptr<transport::ITransport> transport);
  
  void broadcastSnapshot(const ResourceSnapshot& snapshot, const std::vector<std::string>& peerDestinations);

private:
  std::shared_ptr<transport::ITransport> m_transport;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::resource_manager
