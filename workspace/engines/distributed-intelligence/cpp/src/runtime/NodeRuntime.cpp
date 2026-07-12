#include "aegis/die/runtime/NodeRuntime.hpp"

namespace aegis::die::runtime {

NodeRuntime::NodeRuntime()
  : m_node(std::make_shared<node::Node>()) {}

NodeRuntime::NodeRuntime(std::shared_ptr<node::Node> node)
  : m_node(node) {}

std::shared_ptr<node::Node> NodeRuntime::getNode() const {
  return m_node;
}

void NodeRuntime::refreshResources() {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto desc = m_node->getDescriptor();
  desc.resources.cpuUsage = 25.5;
  desc.resources.memoryUsage = 1024 * 1024 * 512;
  m_node->updateDescriptor(desc);
}

void NodeRuntime::refreshCapabilities() {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto desc = m_node->getDescriptor();
  desc.capabilities.cpuCores = 8;
  desc.capabilities.gpuAvailable = true;
  m_node->updateDescriptor(desc);
}

void NodeRuntime::refreshHealth() {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto desc = m_node->getDescriptor();
  desc.health.healthScore = 98;
  desc.health.uptimeSeconds += 10;
  m_node->updateDescriptor(desc);
}

} // namespace aegis::die::runtime
