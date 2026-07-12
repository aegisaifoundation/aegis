#include "../TestHelper.hpp"
#include "aegis/die/state/NodeState.hpp"

DIE_TEST(NodeStateEnumTest) {
  using namespace aegis::die::state;
  NodeState s = NodeState::BOOTING;
  DIE_ASSERT(s == NodeState::BOOTING);
}
