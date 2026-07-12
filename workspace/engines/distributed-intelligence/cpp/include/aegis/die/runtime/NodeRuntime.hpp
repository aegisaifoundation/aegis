#pragma once
#include "../node/Node.hpp"
#include <memory>
#include <mutex>

namespace aegis::die::runtime {

class NodeRuntime {
public:
  NodeRuntime();
  explicit NodeRuntime(std::shared_ptr<node::Node> node);

  std::shared_ptr<node::Node> getNode() const;
  void refreshResources();
  void refreshCapabilities();
  void refreshHealth();

private:
  std::shared_ptr<node::Node> m_node;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::runtime
