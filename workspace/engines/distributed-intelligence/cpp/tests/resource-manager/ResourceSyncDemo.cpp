#include "../TestHelper.hpp"
#include "aegis/die/runtime/DistributedRuntime.hpp"
#include "aegis/die/resource-manager/ResourceManager.hpp"
#include "aegis/die/resource-manager/ResourceSnapshot.hpp"
#include "aegis/die/events/EventDispatcher.hpp"
#include "aegis/die/events/EventListener.hpp"
#include "aegis/die/transport/ITransport.hpp"
#include <thread>
#include <chrono>
#include <iostream>

DIE_TEST(ResourceSyncMultiRuntimeDemo) {
  using namespace aegis::die::runtime;
  using namespace aegis::die::resource_manager;
  using namespace aegis::die::events;

  std::cout << "\n==============================================" << std::endl;
  std::cout << "DEMO: Spawning Resource Synchronization..." << std::endl;
  std::cout << "==============================================" << std::endl;

  RuntimeConfiguration configA;
  configA.node.nodeName = "Runtime-A";
  configA.transport.port = 9020;
  
  RuntimeConfiguration configB;
  configB.node.nodeName = "Runtime-B";
  configB.transport.port = 9021;

  DistributedRuntime rtA(configA);
  DistributedRuntime rtB(configB);

  std::cout << "[Demo] Booting Runtime A..." << std::endl;
  rtA.boot();
  std::cout << "[Demo] Booting Runtime B..." << std::endl;
  rtB.boot();

  auto ctxA = rtA.getContext();
  auto ctxB = rtB.getContext();

  std::cout << "[Demo] Registering ResourceManagers..." << std::endl;
  auto rmA = std::make_shared<ResourceManager>("node-a", ctxA->getEventDispatcher(), ctxA->getTransport());
  auto rmB = std::make_shared<ResourceManager>("node-b", ctxB->getEventDispatcher(), ctxB->getTransport());

  int eventCount = 0;
  std::string lastPayload;
  auto listener = std::make_shared<EventListener>([&eventCount, &lastPayload](const NodeEvent& ev) {
    eventCount++;
    lastPayload = ev.payload;
  });
  ctxB->getEventDispatcher()->subscribe(EventType::StateChanged, listener);

  ctxB->getTransport()->registerMessageHandler([rmB](const std::string&, const std::string& payload) {
    rmB->handleRemoteSnapshot(payload);
  });

  std::cout << "[Demo] Collecting local snapshot from A..." << std::endl;
  ResourceSnapshot snapA;
  snapA.nodeId = "node-a";
  snapA.timestamp = aegis::die::common::now();
  snapA.resources.cpuUsage = 15.0;
  snapA.resources.memoryUsage = 1024 * 1024 * 64;

  rmA->getCache()->updateSnapshot(snapA);

  std::cout << "[Demo] Broadcasting Runtime A snapshot to Runtime B..." << std::endl;
  std::vector<std::string> peers = {"127.0.0.1:9021"};
  auto publisherA = std::make_shared<ResourcePublisher>(ctxA->getTransport());
  publisherA->broadcastSnapshot(snapA, peers);

  std::this_thread::sleep_for(std::chrono::milliseconds(300));

  auto cacheB = rmB->getCache();
  auto latestForA = cacheB->getLatestSnapshot("node-a");
  DIE_ASSERT(latestForA != nullptr);
  DIE_ASSERT(latestForA->resources.cpuUsage == 15.0);
  std::cout << "✔ Node B cached Node A CPU utilization: " << latestForA->resources.cpuUsage << "%" << std::endl;

  std::cout << "[Demo] Simulating utilization load increase on Node A (15.0% -> 75.5%)..." << std::endl;
  snapA.resources.cpuUsage = 75.5;
  snapA.timestamp = aegis::die::common::now();

  rmA->getCache()->updateSnapshot(snapA);
  
  std::cout << "[Demo] Propagation: Re-broadcasting updated snapshot..." << std::endl;
  publisherA->broadcastSnapshot(snapA, peers);

  std::this_thread::sleep_for(std::chrono::milliseconds(300));

  latestForA = cacheB->getLatestSnapshot("node-a");
  DIE_ASSERT(latestForA != nullptr);
  DIE_ASSERT(latestForA->resources.cpuUsage == 75.5);
  std::cout << "✔ Node B successfully updated Node A CPU utilization to: " << latestForA->resources.cpuUsage << "%" << std::endl;
  
  DIE_ASSERT(eventCount > 0);
  std::cout << "✔ Node B EventBus callback successfully verified (triggered: \"" << lastPayload << "\")" << std::endl;

  std::cout << "[Demo] Shutting down runtimes..." << std::endl;
  rtA.shutdown();
  rtB.shutdown();

  std::cout << "🎉 RESOURCE SYNC DEMO PASSED SUCCESSFULLY! 🎉\n" << std::endl;
}
