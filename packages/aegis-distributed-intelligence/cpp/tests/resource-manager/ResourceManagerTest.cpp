#include "../TestHelper.hpp"
#include "aegis/die/resource-manager/ResourceManager.hpp"
#include "aegis/die/resource-manager/ResourceSnapshot.hpp"
#include "aegis/die/common/Types.hpp"
#include <iostream>

DIE_TEST(ResourceManagerCollectorAndCacheTest) {
  using namespace aegis::die::resource_manager;
  
  auto collector = createResourceCollector();
  auto res1 = collector->collect();
  auto res2 = collector->collect();
  DIE_ASSERT(res2.cpuUsage >= 0.0);

  ResourceCache cache;
  ResourceSnapshot snap;
  snap.nodeId = "node-test-cache";
  snap.timestamp = aegis::die::common::now();
  snap.resources = res2;

  cache.updateSnapshot(snap);
  auto latest = cache.getLatestSnapshot("node-test-cache");
  DIE_ASSERT(latest != nullptr);
  DIE_ASSERT(latest->resources.cpuUsage == res2.cpuUsage);

  auto history = cache.getHistory("node-test-cache");
  DIE_ASSERT(history != nullptr);
  DIE_ASSERT(history->getAverageCpuUsage() == res2.cpuUsage);
}

DIE_TEST(ResourceSnapshotSerializationTest) {
  using namespace aegis::die::resource_manager;

  ResourceSnapshot snap;
  snap.nodeId = "node-serial";
  snap.timestamp = aegis::die::common::now();
  snap.resources.cpuUsage = 45.2;
  snap.resources.memoryUsage = 2048;

  std::string jsonStr = snap.toJson();
  DIE_ASSERT(!jsonStr.empty());
  
  ResourceSnapshot snap2;
  bool ok = snap2.fromJson(jsonStr);
  DIE_ASSERT(ok);
  DIE_ASSERT(snap2.nodeId == "node-serial");
  DIE_ASSERT(snap2.resources.cpuUsage == 45.2);
  DIE_ASSERT(snap2.resources.memoryUsage == 2048);
}
