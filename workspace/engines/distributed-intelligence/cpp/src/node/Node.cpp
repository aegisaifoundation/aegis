#include "aegis/die/node/Node.hpp"

namespace aegis::die::node {

Node::Node()
  : m_lifecycle(std::make_shared<lifecycle::LifecycleManager>()) {}

Node::Node(const NodeDescriptor& initialDescriptor)
  : m_descriptor(initialDescriptor),
    m_lifecycle(std::make_shared<lifecycle::LifecycleManager>()) {}

NodeDescriptor Node::getDescriptor() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  return m_descriptor;
}

void Node::updateDescriptor(const NodeDescriptor& desc) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_descriptor = desc;
}

std::shared_ptr<lifecycle::LifecycleManager> Node::getLifecycle() const {
  return m_lifecycle;
}

} // namespace aegis::die::node
