#include "aegis/die/resource-manager/ResourceCache.hpp"

namespace aegis::die::resource_manager {

void ResourceCache::updateSnapshot(const ResourceSnapshot& snapshot) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_latestSnapshots[snapshot.nodeId] = std::make_shared<ResourceSnapshot>(snapshot);
  
  auto& history = m_histories[snapshot.nodeId];
  if (!history) {
    history = std::make_shared<ResourceHistory>();
  }
  history->addSnapshot(snapshot);
}

std::shared_ptr<ResourceSnapshot> ResourceCache::getLatestSnapshot(const common::NodeID& nodeId) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_latestSnapshots.find(nodeId);
  return it != m_latestSnapshots.end() ? it->second : nullptr;
}

std::shared_ptr<ResourceHistory> ResourceCache::getHistory(const common::NodeID& nodeId) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_histories.find(nodeId);
  return it != m_histories.end() ? it->second : nullptr;
}

std::vector<common::NodeID> ResourceCache::getKnownNodes() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<common::NodeID> result;
  for (const auto& pair : m_latestSnapshots) {
    result.push_back(pair.first);
  }
  return result;
}

} // namespace aegis::die::resource_manager
