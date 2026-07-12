#pragma once
#include "ResourceCollector.hpp"
#include "ResourceCache.hpp"
#include <thread>
#include <atomic>
#include <mutex>
#include <functional>
#include <string>

namespace aegis::die::resource_manager {

class ResourceMonitor {
public:
  ResourceMonitor(std::shared_ptr<ResourceCollector> collector, std::shared_ptr<ResourceCache> cache, const std::string& nodeId);
  ~ResourceMonitor();

  void start(int intervalMs = 2000);
  void stop();
  bool isMonitoring() const;
  
  using OnSnapshotCollected = std::function<void(const ResourceSnapshot&)>;
  void registerCallback(OnSnapshotCollected cb);

private:
  void runLoop(int intervalMs);

  std::shared_ptr<ResourceCollector> m_collector;
  std::shared_ptr<ResourceCache> m_cache;
  std::string m_nodeId;
  std::atomic<bool> m_active;
  std::thread m_thread;
  OnSnapshotCollected m_callback;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::resource_manager
