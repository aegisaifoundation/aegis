#include "aegis/die/scheduler/CapabilityScheduler.hpp"
#include <algorithm>
#include <iostream>

namespace aegis::die::scheduler {

static bool vectorContains(const std::vector<std::string>& vec, const std::string& val) {
  return std::find(vec.begin(), vec.end(), val) != vec.end();
}

double CapabilityScheduler::scoreNode(const tasks::DistributedTask& task, 
                                     const capabilities::NodeCapabilities& caps, 
                                     const health::NodeHealth& health) const {
  // --- HARD CONSTRAINTS ---

  // 1. Unhealthy/Dead node check
  if (health.healthScore <= 10 || health.statusSummary == "DEAD" || health.statusSummary == "UNHEALTHY") {
    return -1.0;
  }

  // 2. GPU Requirement
  if (task.requiredResources.gpuRequired && !caps.gpuAvailable) {
    return -1.0;
  }

  // 3. AI Models Requirements
  for (const auto& model : task.requiredCapabilities.models) {
    if (!vectorContains(caps.installedModels, model)) {
      return -1.0;
    }
  }

  // 4. Installed Tools Requirements
  for (const auto& tool : task.requiredCapabilities.tools) {
    if (!vectorContains(caps.installedTools, tool)) {
      return -1.0;
    }
  }

  // 5. Installed Skills Requirements
  for (const auto& skill : task.requiredCapabilities.skills) {
    if (!vectorContains(caps.installedSkills, skill)) {
      return -1.0;
    }
  }

  // 6. Installed Plugins Requirements
  for (const auto& plugin : task.requiredCapabilities.plugins) {
    if (!vectorContains(caps.installedPlugins, plugin)) {
      return -1.0;
    }
  }

  // 7. Trust Level constraint
  if (caps.trustLevel < task.executionConstraints.minTrustLevel) {
    return -1.0;
  }

  // --- SOFT SCORES ---
  double cpuScore = (1.0 - std::clamp(caps.cpuUtilization / 100.0, 0.0, 1.0)) * 20.0;
  double ramScore = (1.0 - std::clamp(caps.ramUtilization / 100.0, 0.0, 1.0)) * 15.0;
  double workloadScore = (1.0 - std::clamp(caps.currentWorkload, 0.0, 1.0)) * 20.0;
  double trustScore = std::clamp(caps.trustLevel, 0.0, 1.0) * 15.0;
  
  // Normalizing latency: smaller latency yields score closer to 15.0
  double latencyScore = (1000.0 / (1000.0 + std::max(0.0, caps.networkLatency))) * 15.0;
  
  double healthScore = (std::clamp(health.healthScore, 0, 100) / 100.0) * 15.0;

  return cpuScore + ramScore + workloadScore + trustScore + latencyScore + healthScore;
}

common::NodeID CapabilityScheduler::scheduleTask(const tasks::DistributedTask& task, 
                                                const std::vector<capabilities::NodeCapabilities>& nodesCaps, 
                                                const std::map<common::NodeID, health::NodeHealth>& healthMap) const {
  common::NodeID bestNodeId;
  double bestScore = -1.0;

  for (const auto& caps : nodesCaps) {
    health::NodeHealth nodeHealth;
    auto healthIt = healthMap.find(caps.nodeId);
    if (healthIt != healthMap.end()) {
      nodeHealth = healthIt->second;
    }
    
    double score = scoreNode(task, caps, nodeHealth);
    if (score > bestScore) {
      bestScore = score;
      bestNodeId = caps.nodeId;
    }
  }

  return bestNodeId;
}

} // namespace aegis::die::scheduler
