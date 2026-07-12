#pragma once
#include "ResourceCollector.hpp"
#include "ResourceCache.hpp"
#include "ResourceMonitor.hpp"
#include "ResourcePublisher.hpp"
#include "ResourceStatistics.hpp"
#include "../events/EventDispatcher.hpp"
#include <memory>
#include <mutex>
#include <string>

namespace aegis::die::resource_manager {

class ResourceManager {
public:
  ResourceManager(const std::string& nodeId,
                  std::shared_ptr<events::EventDispatcher> eventDispatcher,
                  std::shared_ptr<transport::ITransport> transport);
  ~ResourceManager();

  void startMonitoring(int intervalMs = 2000);
  void stopMonitoring();
  
  std::shared_ptr<ResourceCache> getCache() const;
  std::shared_ptr<ResourceStatistics> getStats() const;
  
  void handleRemoteSnapshot(const std::string& jsonStr);

private:
  void onLocalSnapshotCollected(const ResourceSnapshot& snap);

  std::string m_nodeId;
  std::shared_ptr<events::EventDispatcher> m_eventDispatcher;
  std::shared_ptr<ResourceCollector> m_collector;
  std::shared_ptr<ResourceCache> m_cache;
  std::shared_ptr<ResourceMonitor> m_monitor;
  std::shared_ptr<ResourcePublisher> m_publisher;
  std::shared_ptr<ResourceStatistics> m_stats;

  mutable std::mutex m_mutex;
  double m_lastCpu = 0.0;
  uint64_t m_lastMem = 0;
};

} // namespace aegis::die::resource_manager
