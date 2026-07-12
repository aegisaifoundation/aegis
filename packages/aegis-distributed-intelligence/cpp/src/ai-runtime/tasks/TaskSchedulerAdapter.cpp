#include "AITask.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/scheduler/Scheduler.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"

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
  if (nodes.empty()) {
    return m_ctx->getRuntimeConfig().node.nodeName;
  }

  // Convert std::shared_ptr<NodeDescriptor> to NodeDescriptor for DIR scheduler
  std::vector<aegis::die::node::NodeDescriptor> flatNodes;
  for (const auto& nodePtr : nodes) {
    if (nodePtr) {
      flatNodes.push_back(*nodePtr);
    }
  }

  if (flatNodes.empty()) {
    return m_ctx->getRuntimeConfig().node.nodeName;
  }

  die::scheduler::Scheduler dirScheduler;
  std::string bestNode = dirScheduler.scheduleTask(task.goal, flatNodes);
  if (bestNode.empty()) {
    return m_ctx->getRuntimeConfig().node.nodeName;
  }
  return bestNode;
}

} // namespace aegis::air
