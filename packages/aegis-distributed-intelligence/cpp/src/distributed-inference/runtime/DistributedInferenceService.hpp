#pragma once
#include "aegis/die/lifecycle/IService.hpp"
#include <memory>
#include <string>

namespace aegis::die::runtime { class RuntimeContext; }

namespace aegis::dis {

class ModelRegistry;
class ModelManager;
class SessionPool;
class PromptBuilder;
class ContextBuilder;
class TokenStreamer;
class ResponseAssembler;
class PlacementResolver;
class ExecutionAdapter;
class ResponseCache;
class InferenceMetrics;

class DistributedInferenceService : public aegis::die::lifecycle::IService {
public:
  explicit DistributedInferenceService(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx);
  virtual ~DistributedInferenceService() = default;

  void initialize() override;
  void start() override;
  void stop() override;
  void shutdown() override;
  std::string health() override;
  std::string statistics() override;

private:
  std::shared_ptr<aegis::die::runtime::RuntimeContext> m_ctx;
  
  std::shared_ptr<ModelRegistry> m_modelRegistry;
  std::shared_ptr<ModelManager> m_modelManager;
  std::shared_ptr<SessionPool> m_sessionPool;
  std::shared_ptr<PromptBuilder> m_promptBuilder;
  std::shared_ptr<ContextBuilder> m_contextBuilder;
  std::shared_ptr<TokenStreamer> m_tokenStreamer;
  std::shared_ptr<ResponseAssembler> m_responseAssembler;
  std::shared_ptr<PlacementResolver> m_placementResolver;
  std::shared_ptr<ExecutionAdapter> m_executionAdapter;
  std::shared_ptr<ResponseCache> m_responseCache;
  std::shared_ptr<InferenceMetrics> m_metrics;
};

} // namespace aegis::dis
