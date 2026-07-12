#include "AIRuntime.hpp"
#include "AIRuntimeComponents.hpp"
#include "../agents/IAgent.hpp"
#include "../orchestration/Orchestrator.hpp"

namespace aegis::air {

AIRuntime::AIRuntime(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx)
  : m_ctx(ctx),
    m_agentRegistry(std::make_shared<AgentRegistry>()),
    m_lifecycleManager(std::make_shared<AgentLifecycleManager>()),
    m_schedulerAdapter(std::make_shared<TaskSchedulerAdapter>()),
    m_orchestrator(std::make_shared<AgentOrchestrator>(m_agentRegistry, m_schedulerAdapter)),
    m_workflowEngine(std::make_shared<WorkflowEngine>(m_orchestrator)),
    m_memoryManager(std::make_shared<MemoryManager>()),
    m_knowledgeManager(std::make_shared<KnowledgeManager>()),
    m_promptManager(std::make_shared<PromptManager>()),
    m_contextManager(std::make_shared<ContextManager>()),
    m_toolRuntime(std::make_shared<ToolRuntime>()),
    m_serviceManager(std::make_shared<AIServiceManager>()),
    m_metrics(std::make_shared<AIRuntimeMetrics>()),
    m_policyManager(std::make_shared<PolicyManager>()),
    m_trustManager(std::make_shared<TrustManager>()),
    m_modelManager(std::make_shared<ModelManager>()) {
    
    // Wire runtime context to scheduler adapter
    m_schedulerAdapter->setContext(ctx);
}

void AIRuntime::initialize() {
  // Pre-register standard agents so orchestrator has components to schedule
  auto planner = AgentFactory::createAgent("Planner", "System-Planner");
  auto coder = AgentFactory::createAgent("Coder", "System-Coder");
  auto researcher = AgentFactory::createAgent("Researcher", "System-Researcher");

  m_agentRegistry->registerAgent(planner);
  m_agentRegistry->registerAgent(coder);
  m_agentRegistry->registerAgent(researcher);

  m_lifecycleManager->initializeAgent(planner);
  m_lifecycleManager->initializeAgent(coder);
  m_lifecycleManager->initializeAgent(researcher);
}

void AIRuntime::start() {
  auto agents = m_agentRegistry->listAgents();
  for (const auto& agent : agents) {
    m_lifecycleManager->startAgent(agent);
  }
}

void AIRuntime::stop() {
  auto agents = m_agentRegistry->listAgents();
  for (const auto& agent : agents) {
    m_lifecycleManager->stopAgent(agent);
  }
}

void AIRuntime::shutdown() {
  stop();
}

std::string AIRuntime::health() {
  return "HEALTHY";
}

std::string AIRuntime::statistics() {
  return "AIR Tasks Executed: " + std::to_string(m_metrics->getTasksCount());
}

} // namespace aegis::air
