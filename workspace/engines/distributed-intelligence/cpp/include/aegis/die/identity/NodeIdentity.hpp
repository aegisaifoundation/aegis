#pragma once
#include <string>
#include <vector>
#include "../common/Types.hpp"
#include "../version/Version.hpp"

namespace aegis::die::identity {

struct NodeIdentity {
  common::NodeID id;
  std::string publicKey;
  std::string certificate;
  std::string fingerprint;
  
  version::SemanticVersion runtimeVersion{1, 0, 0};
  version::SemanticVersion kernelVersion{1, 0, 0};
  
  std::string hostname;
  std::string platform;
  std::string architecture;
  
  common::Timestamp createdTime = common::now();
  common::Timestamp lastUpdated = common::now();
};

} // namespace aegis::die::identity
