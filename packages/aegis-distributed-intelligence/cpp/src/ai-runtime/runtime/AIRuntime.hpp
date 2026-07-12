#pragma once
#include <memory>
#include "aegis/die/lifecycle/IService.hpp"

namespace aegis::die::runtime { class RuntimeContext; }

namespace aegis::air {

class AgentRegistry;
class AgentLifecycleManager;
class TaskSchedulerAdapter;
class AgentOrchestrator;
class WorkflowEngine;
class MemoryManager;
class KnowledgeManager;
class PromptManager;
class ContextManager;
class ToolRuntime;
class AIServiceManager;
class AIRuntimeMetrics;
class PolicyManager;
class TrustManager;
class ModelManager;

class AIRuntime : public aegis::die::lifecycle::IService {
public:
  explicit AIRuntime(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx);
  virtual ~AIRuntime() = default;

  void initialize() override;
  void start() override;
  void stop() override;
  void shutdown() override;
  std::string health() override;
  std::string statistics() override;

  std::shared_ptr<AgentRegistry> getAgentRegistry() const { return m_agentRegistry; }
  std::shared_ptr<WorkflowEngine> getWorkflowEngine() const { return m_workflowEngine; }
  std::shared_ptr<MemoryManager> getMemoryManager() const { return m_memoryManager; }
  std::shared_ptr<KnowledgeManager> getKnowledgeManager() const { return m_knowledgeManager; }

private:
  std::shared_ptr<aegis::die::runtime::RuntimeContext> m_ctx;
  
  std::shared_ptr<AgentRegistry> m_agentRegistry;
  std::shared_ptr<AgentLifecycleManager> m_lifecycleManager;
  std::shared_ptr<TaskSchedulerAdapter> m_schedulerAdapter;
  std::shared_ptr<AgentOrchestrator> m_orchestrator;
  std::shared_ptr<WorkflowEngine> m_workflowEngine;
  
  std::shared_ptr<MemoryManager> m_memoryManager;
  std::shared_ptr<KnowledgeManager> m_knowledgeManager;
  std::shared_ptr<PromptManager> m_promptManager;
  std::shared_ptr<ContextManager> m_contextManager;
  std::shared_ptr<ToolRuntime> m_toolRuntime;
  std::shared_ptr<AIServiceManager> m_serviceManager;
  std::shared_ptr<AIRuntimeMetrics> m_metrics;
  std::shared_ptr<PolicyManager> m_policyManager;
  std::shared_ptr<TrustManager> m_trustManager;
  std::shared_ptr<ModelManager> m_modelManager;
};

} // namespace aegis::air
