#include "../TestHelper.hpp"
#include "aegis/die/messaging/MessageBus.hpp"
#include <string>

DIE_TEST(MessageBusRouteTest) {
  using namespace aegis::die::messaging;
  using namespace aegis::die::messages;

  MessageBus bus;
  std::string receivedPayload;

  bus.registerRoute("TEST_MSG", [&receivedPayload](const Message& msg) {
    receivedPayload = msg.payload;
  });

  Message msg;
  msg.messageType = "TEST_MSG";
  msg.payload = "Test Message Bus Routing";

  bus.dispatch(msg);
  DIE_ASSERT(receivedPayload == "Test Message Bus Routing");
}
