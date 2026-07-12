#include "../runtime/AIRuntimeComponents.hpp"

namespace aegis::air {

void AIServiceManager::loadService(const std::string& name, std::shared_ptr<IAIService> svc) {
  if (svc) {
    m_services[name] = svc;
    svc->startService();
  }
}

} // namespace aegis::air
