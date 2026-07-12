#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace aegis::die::messaging {

enum class PacketType : uint8_t {
  Handshake = 0x01,
  Heartbeat = 0x02,
  TaskRequest = 0x03,
  TaskResponse = 0x04,
  ResourceState = 0x05,
  CustomMessage = 0xFF
};

struct PacketHeader {
  uint32_t magic = 0x41454749; // "AEGI"
  uint8_t version = 1;
  PacketType type;
  uint32_t payloadLength = 0;
};

} // namespace aegis::die::messaging
