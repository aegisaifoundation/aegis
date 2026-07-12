#include "../TestHelper.hpp"
#include "aegis/die/runtime/DistributedRuntime.hpp"

DIE_TEST(RuntimeBootAndShutdownTest) {
  using namespace aegis::die::runtime;
  
  RuntimeConfiguration config;
  config.node.nodeName = "test-node-boot";
  config.transport.port = 9005;

  DistributedRuntime rt(config);
  DIE_ASSERT(!rt.isRunning());
  DIE_ASSERT(rt.getState() == RuntimeState::OFFLINE);

  rt.boot();
  DIE_ASSERT(rt.isRunning());
  DIE_ASSERT(rt.getState() == RuntimeState::ONLINE);

  rt.shutdown();
  DIE_ASSERT(!rt.isRunning());
  DIE_ASSERT(rt.getState() == RuntimeState::OFFLINE);
}
