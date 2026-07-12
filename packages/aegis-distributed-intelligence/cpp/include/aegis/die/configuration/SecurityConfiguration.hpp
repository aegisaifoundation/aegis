#pragma once
#include <string>

namespace aegis::die::configuration {

struct SecurityConfiguration {
  bool requireSignatures = true;
  std::string privateKeyPath;
  std::string certificatePath;
  std::string tlsCipherSuite = "ECDHE-ECDSA-AES256-GCM-SHA384";
};

} // namespace aegis::die::configuration
