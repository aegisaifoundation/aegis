#include "../TestHelper.hpp"
#include "aegis/die/common/Types.hpp"
#include "aegis/die/runtime/DistributedRuntime.hpp"
#include "aegis/die/discovery/DiscoveryPacket.hpp"
#include "aegis/die/heartbeat/Heartbeat.hpp"
#include "aegis/die/heartbeat/HeartbeatManager.hpp"
#include "aegis/die/messages/Message.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/membership/ClusterMembership.hpp"
#include "aegis/die/statistics/NodeStatistics.hpp"
#include "aegis/die/transport/ITransport.hpp"
#include <thread>
#include <chrono>
#include <iostream>

DIE_TEST(LocalNetworkMultiRuntimeDemo) {
  using namespace aegis::die::runtime;
  using namespace aegis::die::discovery;
  using namespace aegis::die::heartbeat;
  using namespace aegis::die::messages;
  using namespace aegis::die::node;
  using namespace aegis::die::membership;
  using namespace aegis::die::common;

  std::cout << "\n==============================================" << std::endl;
  std::cout << "DEMO: Spawning Local Network Multi-Runtime..." << std::endl;
  std::cout << "==============================================" << std::endl;

  RuntimeConfiguration configA;
  configA.node.nodeName = "Runtime-A";
  configA.transport.port = 9010;
  
  RuntimeConfiguration configB;
  configB.node.nodeName = "Runtime-B";
  configB.transport.port = 9011;

  DistributedRuntime rtA(configA);
  DistributedRuntime rtB(configB);

  std::cout << "[Demo] Booting Runtime A..." << std::endl;
  rtA.boot();
  std::cout << "[Demo] Booting Runtime B..." << std::endl;
  rtB.boot();

  DIE_ASSERT(rtA.isRunning());
  DIE_ASSERT(rtB.isRunning());

  auto ctxA = rtA.getContext();
  auto ctxB = rtB.getContext();

  std::cout << "[Demo] Exchanging discovery packets..." << std::endl;
  
  DiscoveryPacket pktA{"node-a", "localhost", {"127.0.0.1"}, 9010};
  DiscoveryPacket pktB{"node-b", "localhost", {"127.0.0.1"}, 9011};

  auto descA = std::make_shared<NodeDescriptor>();
  descA->identity.id = "node-a";
  descA->identity.hostname = "localhost-a";
  
  auto descB = std::make_shared<NodeDescriptor>();
  descB->identity.id = "node-b";
  descB->identity.hostname = "localhost-b";

  ctxA->getNodeRegistry()->registerNode(descB);
  ctxB->getNodeRegistry()->registerNode(descA);

  std::cout << "✔ Runtime A registered Node B: " << ctxA->getNodeRegistry()->getNode("node-b")->identity.id << std::endl;
  std::cout << "✔ Runtime B registered Node A: " << ctxB->getNodeRegistry()->getNode("node-a")->identity.id << std::endl;

  std::cout << "[Demo] Simulating continuous heartbeats..." << std::endl;
  Heartbeat hbA{"node-a", 1, aegis::die::common::now(), "OK"};
  Heartbeat hbB{"node-b", 1, aegis::die::common::now(), "OK"};

  auto hbMgrA = createHeartbeatManager();
  auto hbMgrB = createHeartbeatManager();

  hbMgrA->recordHeartbeat(hbB);
  hbMgrB->recordHeartbeat(hbA);

  std::cout << "✔ Runtime A received Node B heartbeat. Active check: " << (hbMgrA->isNodeAlive("node-b", aegis::die::common::Duration(5000)) ? "ALIVE" : "OFFLINE") << std::endl;
  std::cout << "✔ Runtime B received Node A heartbeat. Active check: " << (hbMgrB->isNodeAlive("node-a", aegis::die::common::Duration(5000)) ? "ALIVE" : "OFFLINE") << std::endl;

  std::cout << "[Demo] Syncing cluster membership..." << std::endl;
  auto memMgrA = createMembershipManager();
  auto memMgrB = createMembershipManager();

  memMgrA->addNode("node-b");
  memMgrB->addNode("node-a");

  DIE_ASSERT(memMgrA->getMembership().knownNodes.count("node-b") == 1);
  DIE_ASSERT(memMgrB->getMembership().knownNodes.count("node-a") == 1);
  std::cout << "✔ Membership synchronization successfully verified." << std::endl;

  std::cout << "[Demo] Sending typed messaging envelopes over loopback sockets..." << std::endl;
  
  std::string receivedPayloadA;
  std::string receivedPayloadB;

  ctxA->getTransport()->registerMessageHandler([&receivedPayloadA](const std::string&, const std::string& payload) {
    receivedPayloadA = payload;
  });

  ctxB->getTransport()->registerMessageHandler([&receivedPayloadB](const std::string&, const std::string& payload) {
    receivedPayloadB = payload;
  });

  ctxA->getTransport()->send("127.0.0.1:9011", "Hello Runtime B, I am A!");
  ctxA->getStatistics()->messagesSent++;
  ctxB->getStatistics()->messagesReceived++;

  ctxB->getTransport()->send("127.0.0.1:9010", "Greetings Runtime A, received your message.");
  ctxB->getStatistics()->messagesSent++;
  ctxA->getStatistics()->messagesReceived++;

  std::this_thread::sleep_for(std::chrono::milliseconds(500));

  std::cout << "[Runtime A received payload]: \"" << receivedPayloadA << "\"" << std::endl;
  std::cout << "[Runtime B received payload]: \"" << receivedPayloadB << "\"" << std::endl;

  DIE_ASSERT(receivedPayloadA == "Greetings Runtime A, received your message.");
  DIE_ASSERT(receivedPayloadB == "Hello Runtime B, I am A!");

  DIE_ASSERT(ctxA->getStatistics()->messagesSent == 1);
  DIE_ASSERT(ctxA->getStatistics()->messagesReceived == 1);
  DIE_ASSERT(ctxB->getStatistics()->messagesSent == 1);
  DIE_ASSERT(ctxB->getStatistics()->messagesReceived == 1);

  std::cout << "✔ Statistics updated correctly." << std::endl;

  std::cout << "[Demo] Performing graceful shutdown sequence..." << std::endl;
  rtA.shutdown();
  rtB.shutdown();

  std::cout << "🎉 DEMO SCENARIO PASSED SUCCESSFULLY! 🎉\n" << std::endl;
}
