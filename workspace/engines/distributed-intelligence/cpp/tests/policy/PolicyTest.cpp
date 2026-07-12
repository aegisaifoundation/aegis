#include "../TestHelper.hpp"
#include "aegis/die/policy/NodePolicy.hpp"

DIE_TEST(NodePolicyValuesTest) {
  using namespace aegis::die::policy;
  NodePolicy policy;
  DIE_ASSERT(policy.allowDiscovery == true);
  DIE_ASSERT(policy.allowPackageInstallation == false);
}
