#pragma once
#include "../common/Types.hpp"
#include "../common/UUID.hpp"
#include <string>

namespace aegis::die::events {

enum class EventType {
  NodeJoined,
  NodeLeft,
  HeartbeatReceived,
  HeartbeatLost,
  RoleChanged,
  CapabilityUpdated,
  ResourceUpdated,
  HealthChanged,
  MembershipChanged,
  TopologyChanged,
  PolicyChanged,
  StateChanged,
  ConfigurationChanged
};

struct NodeEvent {
  std::string eventId = common::UUID::generate();
  EventType type;
  common::Timestamp timestamp = common::now();
  common::NodeID sourceNode;
  common::NodeID targetNode;
  std::string payload;
};

} // namespace aegis::die::events
