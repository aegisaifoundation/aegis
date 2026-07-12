#include "../TestHelper.hpp"
#include "aegis/die/transport/TcpTransport.hpp"
#include <thread>
#include <chrono>

DIE_TEST(TcpTransportEchoTest) {
  using namespace aegis::die::transport;
  
  TcpTransport trans("127.0.0.1", 9006);
  std::string receivedPayload;
  std::string receivedSender;
  
  trans.registerMessageHandler([&receivedPayload, &receivedSender](const std::string& sender, const std::string& payload) {
    receivedSender = sender;
    receivedPayload = payload;
  });

  trans.start();
  std::this_thread::sleep_for(std::chrono::milliseconds(100));

  trans.send("127.0.0.1:9006", "Hello Transport Echo");
  
  for (int i = 0; i < 10; ++i) {
    if (!receivedPayload.empty()) break;
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  DIE_ASSERT(receivedPayload == "Hello Transport Echo");
  trans.stop();
}
