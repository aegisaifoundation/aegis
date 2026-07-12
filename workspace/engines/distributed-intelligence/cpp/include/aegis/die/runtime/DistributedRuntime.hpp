#pragma once
#include "RuntimeContext.hpp"
#include "RuntimeConfiguration.hpp"
#include "RuntimeState.hpp"
#include <memory>
#include <atomic>
#include <mutex>

namespace aegis::die::runtime {

class DistributedRuntime {
public:
  explicit DistributedRuntime(const RuntimeConfiguration& config);
  ~DistributedRuntime();

  void boot();
  void shutdown();
  bool isRunning() const;
  
  std::shared_ptr<RuntimeContext> getContext() const;
  RuntimeState getState() const;

private:
  RuntimeConfiguration m_config;
  std::shared_ptr<RuntimeContext> m_context;
  std::atomic<RuntimeState> m_state;
  std::atomic<bool> m_running;
  mutable std::mutex m_mutex;
  std::shared_ptr<void> m_serviceManager;
};

} // namespace aegis::die::runtime
