#pragma once
#include "../common/Types.hpp"
#include <string>
#include <vector>

namespace aegis::die::discovery {

struct DiscoveryPacket {
  common::NodeID nodeId;
  std::string hostname;
  std::vector<std::string> addresses;
  int port = 0;
  common::Timestamp timestamp = common::now();
};

} // namespace aegis::die::discovery
