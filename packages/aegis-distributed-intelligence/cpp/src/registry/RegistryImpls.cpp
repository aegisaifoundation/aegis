#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/registry/RoleRegistry.hpp"
#include "aegis/die/registry/CapabilityRegistry.hpp"
#include "aegis/die/registry/ResourceRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include <map>
#include <mutex>

namespace aegis::die::registry {

class NodeRegistryImpl : public NodeRegistry {
public:
  void registerNode(std::shared_ptr<node::NodeDescriptor> descriptor) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_nodes[descriptor->identity.id] = descriptor;
  }

  void unregisterNode(const common::NodeID& nodeId) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_nodes.erase(nodeId);
  }

  std::shared_ptr<node::NodeDescriptor> getNode(const common::NodeID& nodeId) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_nodes.find(nodeId);
    return it != m_nodes.end() ? it->second : nullptr;
  }

  std::vector<std::shared_ptr<node::NodeDescriptor>> listNodes() const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::vector<std::shared_ptr<node::NodeDescriptor>> result;
    for (const auto& pair : m_nodes) {
      result.push_back(pair.second);
    }
    return result;
  }

private:
  std::map<common::NodeID, std::shared_ptr<node::NodeDescriptor>> m_nodes;
  mutable std::mutex m_mutex;
};

class RoleRegistryImpl : public RoleRegistry {
public:
  void assignRole(const common::NodeID& nodeId, roles::NodeRole role) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto& list = m_roles[nodeId];
    for (auto r : list) {
      if (r == role) return;
    }
    list.push_back(role);
  }

  void revokeRole(const common::NodeID& nodeId, roles::NodeRole role) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_roles.find(nodeId);
    if (it != m_roles.end()) {
      auto& list = it->second;
      for (auto listIt = list.begin(); listIt != list.end(); ++listIt) {
        if (*listIt == role) {
          list.erase(listIt);
          break;
        }
      }
    }
  }

  std::vector<roles::NodeRole> getRoles(const common::NodeID& nodeId) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_roles.find(nodeId);
    return it != m_roles.end() ? it->second : std::vector<roles::NodeRole>{};
  }

private:
  std::map<common::NodeID, std::vector<roles::NodeRole>> m_roles;
  mutable std::mutex m_mutex;
};

class CapabilityRegistryImpl : public CapabilityRegistry {
public:
  void updateCapabilities(const common::NodeID& nodeId, const capabilities::NodeCapabilities& caps) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_caps[nodeId] = caps;
  }

  capabilities::NodeCapabilities getCapabilities(const common::NodeID& nodeId) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_caps.find(nodeId);
    return it != m_caps.end() ? it->second : capabilities::NodeCapabilities{};
  }

private:
  std::map<common::NodeID, capabilities::NodeCapabilities> m_caps;
  mutable std::mutex m_mutex;
};

class ResourceRegistryImpl : public ResourceRegistry {
public:
  void updateResources(const common::NodeID& nodeId, const resources::NodeResources& res) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_res[nodeId] = res;
  }

  resources::NodeResources getResources(const common::NodeID& nodeId) const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_res.find(nodeId);
    return it != m_res.end() ? it->second : resources::NodeResources{};
  }

private:
  std::map<common::NodeID, resources::NodeResources> m_res;
  mutable std::mutex m_mutex;
};

std::shared_ptr<NodeRegistry> createNodeRegistry() {
  return std::make_shared<NodeRegistryImpl>();
}
std::shared_ptr<RoleRegistry> createRoleRegistry() {
  return std::make_shared<RoleRegistryImpl>();
}
std::shared_ptr<CapabilityRegistry> createCapabilityRegistry() {
  return std::make_shared<CapabilityRegistryImpl>();
}
std::shared_ptr<ResourceRegistry> createResourceRegistry() {
  return std::make_shared<ResourceRegistryImpl>();
}

} // namespace aegis::die::registry
