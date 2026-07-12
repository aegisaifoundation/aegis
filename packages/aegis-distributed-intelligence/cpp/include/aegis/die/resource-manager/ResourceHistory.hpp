#pragma once
#include "ResourceSnapshot.hpp"
#include <vector>
#include <mutex>

namespace aegis::die::resource_manager {

class ResourceHistory {
public:
  void addSnapshot(const ResourceSnapshot& snapshot);
  std::vector<ResourceSnapshot> getHistory() const;
  
  double getAverageCpuUsage() const;
  uint64_t getAverageMemoryUsage() const;

private:
  std::vector<ResourceSnapshot> m_snapshots;
  mutable std::mutex m_mutex;
  size_t m_maxHistorySize = 100;
};

} // namespace aegis::die::resource_manager
