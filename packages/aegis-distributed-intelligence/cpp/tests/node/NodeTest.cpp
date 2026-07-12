#include "../TestHelper.hpp"
#include "aegis/die/node/Node.hpp"

DIE_TEST(NodeInitializationAndDescriptorTest) {
  using namespace aegis::die::node;
  Node node;
  NodeDescriptor desc = node.getDescriptor();
  desc.identity.hostname = "test-host";
  
  node.updateDescriptor(desc);
  NodeDescriptor desc2 = node.getDescriptor();
  DIE_ASSERT(desc2.identity.hostname == "test-host");
}
