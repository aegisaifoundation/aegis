#pragma once
#include "ResourceSnapshot.hpp"
#include "ResourceHistory.hpp"
#include <map>
#include <mutex>
#include <memory>
#include <vector>

namespace aegis::die::resource_manager {

class ResourceCache {
public:
  void updateSnapshot(const ResourceSnapshot& snapshot);
  std::shared_ptr<ResourceSnapshot> getLatestSnapshot(const common::NodeID& nodeId) const;
  std::shared_ptr<ResourceHistory> getHistory(const common::NodeID& nodeId) const;
  std::vector<common::NodeID> getKnownNodes() const;

private:
  std::map<common::NodeID, std::shared_ptr<ResourceSnapshot>> m_latestSnapshots;
  std::map<common::NodeID, std::shared_ptr<ResourceHistory>> m_histories;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::resource_manager
