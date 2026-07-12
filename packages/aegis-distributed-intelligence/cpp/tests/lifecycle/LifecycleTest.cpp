#include "../TestHelper.hpp"
#include "aegis/die/lifecycle/LifecycleManager.hpp"
#include "aegis/die/lifecycle/StateTransition.hpp"

DIE_TEST(LifecycleTransitionAndValidationTest) {
  using namespace aegis::die::lifecycle;
  using aegis::die::state::NodeState;

  DIE_ASSERT(StateTransition::isValidTransition(NodeState::BOOTING, NodeState::ONLINE));
  DIE_ASSERT(!StateTransition::isValidTransition(NodeState::BOOTING, NodeState::BUSY));

  LifecycleManager mgr;
  DIE_ASSERT(mgr.getCurrentState() == NodeState::BOOTING);
  
  int callCount = 0;
  mgr.registerCallback([&callCount](NodeState oldState, NodeState newState) {
    callCount++;
    DIE_ASSERT(oldState == NodeState::BOOTING);
    DIE_ASSERT(newState == NodeState::ONLINE);
  });

  bool ok = mgr.transitionTo(NodeState::ONLINE);
  DIE_ASSERT(ok);
  DIE_ASSERT(mgr.getCurrentState() == NodeState::ONLINE);
  DIE_ASSERT(callCount == 1);
}
