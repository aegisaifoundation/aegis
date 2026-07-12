#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <mutex>
#include "../node/NodeDescriptor.hpp"

namespace aegis::die::scheduler {

class Scheduler {
public:
  Scheduler() = default;
  ~Scheduler() = default;

  std::string scheduleTask(const std::string& taskName, const std::vector<node::NodeDescriptor>& nodes) {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (nodes.empty()) return "";

    // Select the node with the lowest CPU usage
    std::string bestNodeId = nodes[0].nodeId;
    double lowestCpu = 100.0;
    
    for (const auto& node : nodes) {
      if (node.resources.cpuUsage < lowestCpu) {
        lowestCpu = node.resources.cpuUsage;
        bestNodeId = node.nodeId;
      }
    }
    return bestNodeId;
  }

private:
  std::mutex m_mutex;
};

} // namespace aegis::die::scheduler
