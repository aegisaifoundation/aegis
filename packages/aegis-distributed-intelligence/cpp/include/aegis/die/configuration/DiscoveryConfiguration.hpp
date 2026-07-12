#pragma once
#include <string>
#include <vector>

namespace aegis::die::configuration {

struct DiscoveryConfiguration {
  bool allowDiscovery = true;
  std::vector<std::string> bootstrapNodes;
  int discoveryIntervalMs = 5000;
  std::string discoveryProtocol = "mdns";
};

} // namespace aegis::die::configuration
