#pragma once
#include "../common/Types.hpp"
#include <set>
#include <memory>

namespace aegis::die::membership {

struct ClusterMembership {
  std::set<common::NodeID> knownNodes;
  std::set<common::NodeID> trustedNodes;
  std::set<common::NodeID> disconnectedNodes;
  std::set<common::NodeID> rejectedNodes;
  
  uint64_t membershipVersion = 1;
  common::ClusterID clusterId;
  uint64_t epoch = 0;
};

class MembershipManager {
public:
  virtual ~MembershipManager() = default;
  virtual void addNode(const common::NodeID& id) = 0;
  virtual void removeNode(const common::NodeID& id) = 0;
  virtual void trustNode(const common::NodeID& id) = 0;
  virtual void rejectNode(const common::NodeID& id) = 0;
  virtual const ClusterMembership& getMembership() const = 0;
};

std::shared_ptr<MembershipManager> createMembershipManager();

} // namespace aegis::die::membership
