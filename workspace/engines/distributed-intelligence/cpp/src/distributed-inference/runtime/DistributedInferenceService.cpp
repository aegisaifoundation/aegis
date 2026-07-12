#include "DistributedInferenceService.hpp"
#include "../models/ModelRegistry.hpp"
#include "../models/ModelManager.hpp"
#include "../inference/InferenceComponents.hpp"
#include "../execution/ExecutionComponents.hpp"
#include <iostream>

namespace aegis::dis {

DistributedInferenceService::DistributedInferenceService(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx)
  : m_ctx(ctx),
    m_modelRegistry(std::make_shared<ModelRegistry>()),
    m_modelManager(std::make_shared<ModelManager>(m_modelRegistry)),
    m_sessionPool(std::make_shared<SessionPool>()),
    m_promptBuilder(std::make_shared<PromptBuilder>()),
    m_contextBuilder(std::make_shared<ContextBuilder>()),
    m_tokenStreamer(std::make_shared<TokenStreamer>()),
    m_responseAssembler(std::make_shared<ResponseAssembler>()),
    m_placementResolver(std::make_shared<PlacementResolver>(ctx)),
    m_executionAdapter(std::make_shared<ExecutionAdapter>(m_placementResolver)),
    m_responseCache(std::make_shared<ResponseCache>()),
    m_metrics(std::make_shared<InferenceMetrics>()) {}

void DistributedInferenceService::initialize() {
  // Pre-register a default GGUF model config
  ModelMetadata meta;
  meta.name = "llama-3-8b";
  meta.version = "3.0.0";
  meta.architecture = "llama";
  meta.backend = "llama";
  meta.contextLength = 4096;
  meta.gpuRequired = false;
  
  m_modelRegistry->registerModel(meta);
  std::cout << "[DIS] Registered default model: " << meta.name << std::endl;
}

void DistributedInferenceService::start() {
  std::cout << "[DIS] Distributed Inference Service started." << std::endl;
}

void DistributedInferenceService::stop() {
  std::cout << "[DIS] Distributed Inference Service stopped." << std::endl;
}

void DistributedInferenceService::shutdown() {
  stop();
}

std::string DistributedInferenceService::health() {
  return "HEALTHY";
}

std::string DistributedInferenceService::statistics() {
  return "DIS Active Models: 1";
}

} // namespace aegis::dis
