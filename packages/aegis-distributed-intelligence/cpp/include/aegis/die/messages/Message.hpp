#pragma once
#include "../common/Types.hpp"
#include "../common/UUID.hpp"
#include <string>

namespace aegis::die::messages {

struct Message {
  std::string messageId = common::UUID::generate();
  common::NodeID source;
  common::NodeID destination;
  std::string protocolVersion = "1.0.0";
  std::string messageType;
  common::Timestamp timestamp = common::now();
  common::Priority priority = 0;
  std::string payload;
  std::string checksum;
  int ttl = 64;
};

} // namespace aegis::die::messages
