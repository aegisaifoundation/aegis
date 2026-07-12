#pragma once
#include "Heartbeat.hpp"
#include <vector>
#include <memory>

namespace aegis::die::heartbeat {

class HeartbeatManager {
public:
  virtual ~HeartbeatManager() = default;
  virtual void recordHeartbeat(const Heartbeat& hb) = 0;
  virtual std::vector<Heartbeat> getHistory(const common::NodeID& nodeId) const = 0;
  virtual bool isNodeAlive(const common::NodeID& nodeId, common::Duration timeout) const = 0;
};

std::shared_ptr<HeartbeatManager> createHeartbeatManager();

} // namespace aegis::die::heartbeat
