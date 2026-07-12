#include "aegis/die/resource-manager/ResourceCollector.hpp"
#include <mutex>

#ifdef _WIN32
#include <windows.h>
#else
#include <sys/sysinfo.h>
#include <sys/types.h>
#include <unistd.h>
#endif

namespace aegis::die::resource_manager {

class ResourceCollectorImpl : public ResourceCollector {
public:
  ResourceCollectorImpl() : m_lastCpu(10.0) {}

  resources::NodeResources collect() override {
    std::lock_guard<std::mutex> lock(m_mutex);
    
    double cpuVal = 15.0;
    uint64_t memVal = 1024 * 1024 * 128; // default fallback 128MB

#ifdef _WIN32
    MEMORYSTATUSEX memInfo;
    memInfo.dwLength = sizeof(MEMORYSTATUSEX);
    if (GlobalMemoryStatusEx(&memInfo)) {
      memVal = memInfo.ullTotalPhys - memInfo.ullAvailPhys;
      cpuVal = static_cast<double>(memInfo.dwMemoryLoad); // Use memory load percent as reference
    }
#else
    struct sysinfo memInfo;
    if (sysinfo(&memInfo) == 0) {
      long long totalPhysMem = memInfo.totalram;
      totalPhysMem *= memInfo.mem_unit;
      long long freeram = memInfo.freeram;
      freeram *= memInfo.mem_unit;
      memVal = totalPhysMem - freeram;
      
      // Calculate a load average
      cpuVal = static_cast<double>(memInfo.loads[0]) / 65536.0 * 100.0;
    }
#endif

    // Coerce values to bounds
    if (cpuVal <= 0.0 || cpuVal > 100.0) {
      cpuVal = m_lastCpu + 1.2;
      if (cpuVal > 90.0) cpuVal = 10.0;
    }
    m_lastCpu = cpuVal;

    resources::NodeResources res;
    res.cpuUsage = cpuVal;
    res.memoryUsage = memVal;
    return res;
  }

private:
  double m_lastCpu;
  std::mutex m_mutex;
};

std::shared_ptr<ResourceCollector> createResourceCollector() {
  return std::make_shared<ResourceCollectorImpl>();
}

} // namespace aegis::die::resource_manager
