#pragma once
#include "../roles/NodeRole.hpp"
#include "../common/Types.hpp"
#include <vector>

namespace aegis::die::registry {

class RoleRegistry {
public:
  virtual ~RoleRegistry() = default;
  virtual void assignRole(const common::NodeID& nodeId, roles::NodeRole role) = 0;
  virtual void revokeRole(const common::NodeID& nodeId, roles::NodeRole role) = 0;
  virtual std::vector<roles::NodeRole> getRoles(const common::NodeID& nodeId) const = 0;
};

std::shared_ptr<RoleRegistry> createRoleRegistry();

} // namespace aegis::die::registry
