#pragma once
#include "NodeDescriptor.hpp"
#include "../lifecycle/LifecycleManager.hpp"
#include <mutex>
#include <memory>

namespace aegis::die::node {

class Node {
public:
  Node();
  explicit Node(const NodeDescriptor& initialDescriptor);

  NodeDescriptor getDescriptor() const;
  void updateDescriptor(const NodeDescriptor& desc);
  
  std::shared_ptr<lifecycle::LifecycleManager> getLifecycle() const;

private:
  NodeDescriptor m_descriptor;
  std::shared_ptr<lifecycle::LifecycleManager> m_lifecycle;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::node
