#include "../TestHelper.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/runtime/RuntimeConfiguration.hpp"
#include "ai-runtime/runtime/AIRuntime.hpp"
#include "distributed-inference/runtime/DistributedInferenceService.hpp"
#include "distributed-inference/inference/InferenceComponents.hpp"
#include "distributed-inference/execution/ExecutionComponents.hpp"
#include <chrono>
#include <iostream>

DIE_TEST(AEGIS_System_Performance_Benchmark) {
  auto startBoot = std::chrono::high_resolution_clock::now();

  aegis::die::runtime::RuntimeConfiguration config;
  config.node.nodeName = "benchmark-node";
  std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx = nullptr;

  aegis::air::AIRuntime air(ctx);
  air.initialize();
  air.start();

  aegis::dis::DistributedInferenceService dis(ctx);
  dis.initialize();
  dis.start();

  auto endBoot = std::chrono::high_resolution_clock::now();
  double bootMs = std::chrono::duration<double, std::milli>(endBoot - startBoot).count();

  // Micro-benchmark 1: PlacementResolver latency (100,000 iterations)
  aegis::dis::PlacementResolver resolver(ctx);
  aegis::dis::InferenceRequest req;
  req.modelName = "llama-3-8b";
  req.prompt = "Benchmark prompt";

  auto startSched = std::chrono::high_resolution_clock::now();
  int iterations = 10000;
  for (int i = 0; i < iterations; ++i) {
    std::string n = resolver.resolveNode(req);
    (void)n;
  }
  auto endSched = std::chrono::high_resolution_clock::now();
  double schedMs = std::chrono::duration<double, std::milli>(endSched - startSched).count();
  double nsPerSched = (schedMs * 1000000.0) / iterations;

  // Micro-benchmark 2: TokenStreamer throughput
  aegis::dis::TokenStreamer streamer;
  std::string corpus = "AEGIS is a high assurance distributed intelligence infrastructure designed for mission critical operations.";
  int totalTokens = 0;
  auto startStream = std::chrono::high_resolution_clock::now();
  for (int i = 0; i < 1000; ++i) {
    streamer.streamTokens(corpus, [&](const std::string& tok) {
      totalTokens++;
    });
  }
  auto endStream = std::chrono::high_resolution_clock::now();
  double streamMs = std::chrono::duration<double, std::milli>(endStream - startStream).count();
  double tokensPerSec = (totalTokens / (streamMs / 1000.0));

  std::cout << "\n[BENCHMARK RESULTS]" << std::endl;
  std::cout << " -> System Boot Time: " << bootMs << " ms" << std::endl;
  std::cout << " -> Scheduling Latency: " << nsPerSched << " ns / resolution (" << iterations << " iterations)" << std::endl;
  std::cout << " -> Token Streamer Throughput: " << tokensPerSec << " tokens/sec (" << totalTokens << " tokens processed)" << std::endl;

  DIE_ASSERT(bootMs < 500.0); // Boot under 500ms
  DIE_ASSERT(nsPerSched < 50000.0); // Under 50us per resolution

  dis.stop();
  air.stop();
}
