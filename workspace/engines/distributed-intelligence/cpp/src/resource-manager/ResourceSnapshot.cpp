#include "aegis/die/resource-manager/ResourceSnapshot.hpp"
#include <sstream>

namespace aegis::die::resource_manager {

std::string ResourceSnapshot::toJson() const {
  std::stringstream ss;
  ss << "{"
     << "\"nodeId\":\"" << nodeId << "\","
     << "\"timestamp\":" << timestamp.time_since_epoch().count() << ","
     << "\"cpuUsage\":" << resources.cpuUsage << ","
     << "\"memoryUsage\":" << resources.memoryUsage << ","
     << "\"uptimeSeconds\":" << health.uptimeSeconds << ","
     << "\"healthScore\":" << health.healthScore << ","
     << "\"messagesSent\":" << stats.messagesSent
     << "}";
  return ss.str();
}

bool ResourceSnapshot::fromJson(const std::string& jsonStr) {
  if (jsonStr.empty()) return false;
  
  auto posNodeId = jsonStr.find("\"nodeId\":\"");
  if (posNodeId != std::string::npos) {
    auto start = posNodeId + 10;
    auto end = jsonStr.find("\"", start);
    nodeId = jsonStr.substr(start, end - start);
  }

  auto posCpu = jsonStr.find("\"cpuUsage\":");
  if (posCpu != std::string::npos) {
    auto start = posCpu + 11;
    auto end = jsonStr.find(",", start);
    resources.cpuUsage = std::stod(jsonStr.substr(start, end - start));
  }

  auto posMem = jsonStr.find("\"memoryUsage\":");
  if (posMem != std::string::npos) {
    auto start = posMem + 14;
    auto end = jsonStr.find(",", start);
    if (end != std::string::npos) {
      resources.memoryUsage = std::stoull(jsonStr.substr(start, end - start));
    } else {
      // In case it is the last element
      auto lastEnd = jsonStr.find("}", start);
      resources.memoryUsage = std::stoull(jsonStr.substr(start, lastEnd - start));
    }
  }

  return true;
}

} // namespace aegis::die::resource_manager
