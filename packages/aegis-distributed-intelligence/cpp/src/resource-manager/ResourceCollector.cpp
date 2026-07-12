#include "aegis/die/resource-manager/ResourceCollector.hpp"
#include <mutex>

namespace aegis::die::resource_manager {

class ResourceCollectorImpl : public ResourceCollector {
public:
  ResourceCollectorImpl() : m_cpuUsage(10.0), m_memUsage(1024 * 1024 * 128) {}

  resources::NodeResources collect() override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_cpuUsage += 1.5;
    if (m_cpuUsage > 90.0) m_cpuUsage = 10.0;
    
    resources::NodeResources res;
    res.cpuUsage = m_cpuUsage;
    res.memoryUsage = m_memUsage;
    return res;
  }

private:
  double m_cpuUsage;
  uint64_t m_memUsage;
  std::mutex m_mutex;
};

std::shared_ptr<ResourceCollector> createResourceCollector() {
  return std::make_shared<ResourceCollectorImpl>();
}

} // namespace aegis::die::resource_manager
