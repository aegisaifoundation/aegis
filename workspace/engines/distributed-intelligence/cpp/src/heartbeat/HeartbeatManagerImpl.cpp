#include "aegis/die/heartbeat/HeartbeatManager.hpp"
#include <map>
#include <mutex>

namespace aegis::die::heartbeat {

class HeartbeatManagerImpl : public HeartbeatManager {
public:
  void recordHeartbeat(const Heartbeat& hb) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_history[hb.senderId].push_back(hb);
    
    auto& list = m_history[hb.senderId];
    if (list.size() > 50) {
      list.erase(list.begin());
    }
  }

  std::vector<Heartbeat> getHistory(const common::NodeID& nodeId) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_history.find(nodeId);
    return it != m_history.end() ? it->second : std::vector<Heartbeat>{};
  }

  bool isNodeAlive(const common::NodeID& nodeId, common::Duration timeout) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_history.find(nodeId);
    if (it == m_history.end() || it->second.empty()) return false;
    
    auto lastHbTime = it->second.back().timestamp;
    auto now = common::now();
    return (now - lastHbTime) < timeout;
  }

private:
  std::map<common::NodeID, std::vector<Heartbeat>> m_history;
  mutable std::mutex m_mutex;
};

std::shared_ptr<HeartbeatManager> createHeartbeatManager() {
  return std::make_shared<HeartbeatManagerImpl>();
}

} // namespace aegis::die::heartbeat
