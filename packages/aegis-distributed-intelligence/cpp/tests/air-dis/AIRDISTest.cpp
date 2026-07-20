#include "../TestHelper.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/runtime/RuntimeConfiguration.hpp"
#include "ai-runtime/runtime/AIRuntime.hpp"
#include "distributed-inference/runtime/DistributedInferenceService.hpp"
#include "distributed-inference/inference/InferenceComponents.hpp"
#include "distributed-inference/execution/ExecutionComponents.hpp"
#include <memory>
#include <string>

DIE_TEST(AIR_Runtime_Execution_Test) {
  aegis::die::runtime::RuntimeConfiguration config;
  config.node.nodeName = "test-air-node";
  std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx = nullptr;

  aegis::air::AIRuntime air(ctx);
  air.initialize();
  air.start();

  DIE_ASSERT(air.health() == "HEALTHY");

  air.stop();
  air.shutdown();
}

DIE_TEST(DIS_Inference_Execution_Test) {
  aegis::die::runtime::RuntimeConfiguration config;
  config.node.nodeName = "test-dis-node";
  std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx = nullptr;

  aegis::dis::DistributedInferenceService dis(ctx);
  dis.initialize();
  dis.start();

  DIE_ASSERT(dis.health() == "HEALTHY");

  // Verify PromptBuilder
  aegis::dis::PromptBuilder promptBuilder;
  std::string prompt = promptBuilder.buildPrompt("System Directive", "Calculate pi", "Context facts");
  DIE_ASSERT(prompt.find("System Directive") != std::string::npos);
  DIE_ASSERT(prompt.find("Calculate pi") != std::string::npos);

  // Verify TokenStreamer
  aegis::dis::TokenStreamer streamer;
  int tokenCount = 0;
  streamer.streamTokens("The quick brown fox jumps over the lazy dog", [&](const std::string& token) {
    tokenCount++;
  });
  DIE_ASSERT(tokenCount == 9);

  // Verify PlacementResolver
  aegis::dis::InferenceRequest req;
  req.modelName = "llama-3-8b";
  req.prompt = prompt;
  
  aegis::dis::PlacementResolver resolver(ctx);
  std::string node = resolver.resolveNode(req);
  DIE_ASSERT(!node.empty());

  dis.stop();
  dis.shutdown();
}
