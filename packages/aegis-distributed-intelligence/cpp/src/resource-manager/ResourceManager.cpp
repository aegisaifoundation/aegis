#include "aegis/die/resource-manager/ResourceManager.hpp"
#include <cmath>

namespace aegis::die::resource_manager {

ResourceManager::ResourceManager(const std::string& nodeId,
                                 std::shared_ptr<events::EventDispatcher> eventDispatcher,
                                 std::shared_ptr<transport::ITransport> transport)
  : m_nodeId(nodeId),
    m_eventDispatcher(eventDispatcher),
    m_collector(createResourceCollector()),
    m_cache(std::make_shared<ResourceCache>()),
    m_monitor(std::make_shared<ResourceMonitor>(m_collector, m_cache, nodeId)),
    m_publisher(std::make_shared<ResourcePublisher>(transport)),
    m_stats(std::make_shared<ResourceStatistics>()) {
    
    m_monitor->registerCallback([this](const ResourceSnapshot& snap) {
      onLocalSnapshotCollected(snap);
    });
}

ResourceManager::~ResourceManager() {
  stopMonitoring();
}

void ResourceManager::startMonitoring(int intervalMs) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_monitor->start(intervalMs);
}

void ResourceManager::stopMonitoring() {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_monitor->stop();
}

std::shared_ptr<ResourceCache> ResourceManager::getCache() const {
  return m_cache;
}

std::shared_ptr<ResourceStatistics> ResourceManager::getStats() const {
  return m_stats;
}

void ResourceManager::handleRemoteSnapshot(const std::string& jsonStr) {
  ResourceSnapshot snap;
  if (snap.fromJson(jsonStr)) {
    m_cache->updateSnapshot(snap);
    
    std::lock_guard<std::mutex> lock(m_mutex);
    m_stats->broadcastsReceived++;
    
    if (m_eventDispatcher) {
      events::NodeEvent ev;
      ev.type = events::EventType::StateChanged;
      ev.payload = "Remote snapshot updated: " + snap.nodeId;
      m_eventDispatcher->dispatch(ev);
    }
  } else {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_stats->syncFailures++;
  }
}

void ResourceManager::onLocalSnapshotCollected(const ResourceSnapshot& snap) {
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_stats->snapshotsCollected++;
  }
  
  if (std::abs(snap.resources.cpuUsage - m_lastCpu) > 5.0) {
    m_lastCpu = snap.resources.cpuUsage;
    if (m_eventDispatcher) {
      events::NodeEvent ev;
      ev.type = events::EventType::StateChanged;
      ev.payload = "CpuChanged";
      m_eventDispatcher->dispatch(ev);
    }
  }

  if (snap.resources.memoryUsage != m_lastMem) {
    m_lastMem = snap.resources.memoryUsage;
    if (m_eventDispatcher) {
      events::NodeEvent ev;
      ev.type = events::EventType::StateChanged;
      ev.payload = "MemoryChanged";
      m_eventDispatcher->dispatch(ev);
    }
  }

  {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_stats->broadcastsSent++;
  }
}

} // namespace aegis::die::resource_manager
