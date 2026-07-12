#pragma once
#include <string>
#include <sstream>

namespace aegis::die::version {

struct SemanticVersion {
  int major = 1;
  int minor = 0;
  int patch = 0;

  std::string to_string() const {
    std::stringstream ss;
    ss << major << "." << minor << "." << patch;
    return ss.str();
  }

  bool operator==(const SemanticVersion& other) const {
    return major == other.major && minor == other.minor && patch == other.patch;
  }
};

} // namespace aegis::die::version
