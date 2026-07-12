#include "aegis/die/resource-manager/ResourceMonitor.hpp"
#include <chrono>

namespace aegis::die::resource_manager {

ResourceMonitor::ResourceMonitor(std::shared_ptr<ResourceCollector> collector, std::shared_ptr<ResourceCache> cache, const std::string& nodeId)
  : m_collector(collector), m_cache(cache), m_nodeId(nodeId), m_active(false) {}

ResourceMonitor::~ResourceMonitor() {
  stop();
}

void ResourceMonitor::start(int intervalMs) {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_active) return;
  m_active = true;
  m_thread = std::thread(&ResourceMonitor::runLoop, this, intervalMs);
}

void ResourceMonitor::stop() {
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_active) return;
    m_active = false;
  }
  if (m_thread.joinable()) {
    m_thread.join();
  }
}

bool ResourceMonitor::isMonitoring() const {
  return m_active;
}

void ResourceMonitor::registerCallback(OnSnapshotCollected cb) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_callback = cb;
}

void ResourceMonitor::runLoop(int intervalMs) {
  while (m_active) {
    if (m_collector && m_cache) {
      resources::NodeResources res = m_collector->collect();
      
      ResourceSnapshot snap;
      snap.nodeId = m_nodeId;
      snap.timestamp = common::now();
      snap.resources = res;
      
      m_cache->updateSnapshot(snap);

      OnSnapshotCollected cbCopy;
      {
        std::lock_guard<std::mutex> lock(m_mutex);
        cbCopy = m_callback;
      }
      if (cbCopy) {
        cbCopy(snap);
      }
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(intervalMs));
  }
}

} // namespace aegis::die::resource_manager
