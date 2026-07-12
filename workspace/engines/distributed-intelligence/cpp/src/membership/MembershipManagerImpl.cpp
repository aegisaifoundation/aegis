#include "aegis/die/membership/ClusterMembership.hpp"
#include <mutex>
#include <memory>

namespace aegis::die::membership {

class MembershipManagerImpl : public MembershipManager {
public:
  void addNode(const common::NodeID& id) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_membership.knownNodes.insert(id);
    m_membership.disconnectedNodes.erase(id);
    m_membership.rejectedNodes.erase(id);
    m_membership.membershipVersion++;
  }

  void removeNode(const common::NodeID& id) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_membership.knownNodes.erase(id);
    m_membership.trustedNodes.erase(id);
    m_membership.disconnectedNodes.insert(id);
    m_membership.membershipVersion++;
  }

  void trustNode(const common::NodeID& id) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_membership.knownNodes.insert(id);
    m_membership.trustedNodes.insert(id);
    m_membership.rejectedNodes.erase(id);
    m_membership.membershipVersion++;
  }

  void rejectNode(const common::NodeID& id) override {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_membership.knownNodes.erase(id);
    m_membership.trustedNodes.erase(id);
    m_membership.rejectedNodes.insert(id);
    m_membership.membershipVersion++;
  }

  const ClusterMembership& getMembership() const override {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_membership;
  }

private:
  ClusterMembership m_membership;
  mutable std::mutex m_mutex;
};

std::shared_ptr<MembershipManager> createMembershipManager() {
  return std::make_shared<MembershipManagerImpl>();
}

} // namespace aegis::die::membership
