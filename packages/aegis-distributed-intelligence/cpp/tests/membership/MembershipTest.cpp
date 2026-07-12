#include "../TestHelper.hpp"
#include "aegis/die/membership/ClusterMembership.hpp"

DIE_TEST(ClusterMembershipStateTest) {
  using namespace aegis::die::membership;
  ClusterMembership membership;
  membership.knownNodes.insert("node-1");
  membership.trustedNodes.insert("node-1");
  
  DIE_ASSERT(membership.knownNodes.size() == 1);
  DIE_ASSERT(membership.trustedNodes.count("node-1") == 1);
}
