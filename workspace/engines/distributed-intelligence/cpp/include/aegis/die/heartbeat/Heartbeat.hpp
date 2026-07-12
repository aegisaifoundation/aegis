#pragma once
#include "../common/Types.hpp"
#include <string>

namespace aegis::die::heartbeat {

struct Heartbeat {
  common::NodeID senderId;
  uint64_t sequenceNumber = 0;
  common::Timestamp timestamp = common::now();
  std::string status = "OK";
};

} // namespace aegis::die::heartbeat
