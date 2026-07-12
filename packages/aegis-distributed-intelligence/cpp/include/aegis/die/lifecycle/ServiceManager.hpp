#pragma once
#include "IService.hpp"
#include <vector>
#include <memory>
#include <string>
#include <mutex>

namespace aegis::die::lifecycle {

class ServiceManager {
public:
  ServiceManager() = default;
  ~ServiceManager() { shutdownAll(); }

  void registerService(const std::string& name, std::shared_ptr<IService> service) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_services.push_back({name, service});
  }

  void initializeAll() {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& entry : m_services) {
      entry.service->initialize();
    }
  }

  void startAll() {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& entry : m_services) {
      entry.service->start();
    }
  }

  void stopAll() {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& entry : m_services) {
      entry.service->stop();
    }
  }

  void shutdownAll() {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& entry : m_services) {
      entry.service->shutdown();
    }
    m_services.clear();
  }

private:
  struct ServiceEntry {
    std::string name;
    std::shared_ptr<IService> service;
  };
  std::vector<ServiceEntry> m_services;
  std::mutex m_mutex;
};

} // namespace aegis::die::lifecycle
