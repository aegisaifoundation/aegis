#pragma once
#include <string>
#include <map>

namespace aegis::die::metadata {

struct Annotation {
  std::map<std::string, std::string> items;
};

} // namespace aegis::die::metadata
