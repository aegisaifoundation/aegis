#pragma once
#include <string>

namespace aegis::die::configuration {

struct NodeConfiguration {
  std::string nodeName;
  std::string roleMode = "hybrid";
  bool autoStart = true;
};

} // namespace aegis::die::configuration
