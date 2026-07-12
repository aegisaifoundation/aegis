#pragma once
#include <string>
#include <vector>

namespace aegis::die::kernel {

struct KernelConfig {
  std::string nodeName = "aegis-die-node";
  std::string workspacePath = "./workspace";
  std::vector<std::string> bootstrapNodes;
  bool enableDiscovery = true;
};

} // namespace aegis::die::kernel
