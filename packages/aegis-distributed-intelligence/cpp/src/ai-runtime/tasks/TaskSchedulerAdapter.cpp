#include "AITask.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/scheduler/CapabilityScheduler.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/registry/CapabilityRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include "aegis/die/tasks/DistributedTask.hpp"
#include <vector>

namespace aegis::air {

std::string TaskSchedulerAdapter::getExecutionLocation(const AITask& task) {
  if (!m_ctx) {
    return "local";
  }

  auto registry = m_ctx->getNodeRegistry();
  if (!registry) {
    return m_ctx->getRuntimeConfig().node.nodeName;
  }

  auto nodes = registry->listNodes();
  
  // Build node capabilities and health lists
  std::vector<aegis::die::capabilities::NodeCapabilities> allCaps;
  std::map<aegis::die::common::NodeID, aegis::die::health::NodeHealth> healthMap;

  // Add local node
  aegis::die::capabilities::NodeCapabilities localCaps;
  localCaps.nodeId = m_ctx->getRuntimeConfig().node.nodeName;
  localCaps.cpuCores = 8;
  localCaps.gpuAvailable = true;
  localCaps.installedModels = {task.preferredModel};
  localCaps.trustLevel = 1.0;
  allCaps.push_back(localCaps);
  healthMap[localCaps.nodeId] = aegis::die::health::NodeHealth();

  auto capReg = m_ctx->getCapabilityRegistry();
  for (const auto& nodePtr : nodes) {
    if (nodePtr) {
      aegis::die::capabilities::NodeCapabilities c;
      if (capReg) {
        c = capReg->getCapabilities(nodePtr->identity.id);
      }
      c.nodeId = nodePtr->identity.id;
      allCaps.push_back(c);
      healthMap[nodePtr->identity.id] = nodePtr->health;
    }
  }

  // Map AITask to DistributedTask for capability scheduler
  aegis::die::tasks::DistributedTask distTask;
  distTask.taskId = task.taskId;
  distTask.parentTaskId = task.parentTaskId;
  distTask.priority = static_cast<int>(task.priority);
  distTask.requiredCapabilities.models = {task.preferredModel};
  distTask.requiredCapabilities.tools = task.requiredTools;
  distTask.requiredCapabilities.skills = task.requiredCapabilities;
  distTask.taskType = task.requiredCapabilities.empty() ? "general" : task.requiredCapabilities[0];
  distTask.payload = task.goal;
  for (const auto& [k, v] : task.metadata) {
    distTask.metadata[k] = v;
  }

  aegis::die::scheduler::CapabilityScheduler capabilityScheduler;
  std::string bestNode = capabilityScheduler.scheduleTask(distTask, allCaps, healthMap);
  if (bestNode.empty()) {
    return m_ctx->getRuntimeConfig().node.nodeName;
  }
  return bestNode;
}

} // namespace aegis::air
