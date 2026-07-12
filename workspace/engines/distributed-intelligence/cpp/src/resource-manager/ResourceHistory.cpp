#include "aegis/die/resource-manager/ResourceHistory.hpp"

namespace aegis::die::resource_manager {

void ResourceHistory::addSnapshot(const ResourceSnapshot& snapshot) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_snapshots.push_back(snapshot);
  if (m_snapshots.size() > m_maxHistorySize) {
    m_snapshots.erase(m_snapshots.begin());
  }
}

std::vector<ResourceSnapshot> ResourceHistory::getHistory() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_snapshots;
}

double ResourceHistory::getAverageCpuUsage() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_snapshots.empty()) return 0.0;
  double sum = 0.0;
  for (const auto& s : m_snapshots) {
    sum += s.resources.cpuUsage;
  }
  return sum / m_snapshots.size();
}

uint64_t ResourceHistory::getAverageMemoryUsage() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_snapshots.empty()) return 0;
  uint64_t sum = 0;
  for (const auto& s : m_snapshots) {
    sum += s.resources.memoryUsage;
  }
  return sum / m_snapshots.size();
}

} // namespace aegis::die::resource_manager
