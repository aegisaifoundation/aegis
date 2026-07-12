#include "aegis/die/runtime/DistributedRuntime.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/kernel/KernelContext.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/registry/RoleRegistry.hpp"
#include "aegis/die/registry/CapabilityRegistry.hpp"
#include "aegis/die/registry/ResourceRegistry.hpp"
#include "aegis/die/messaging/MessageBus.hpp"
#include "aegis/die/transport/TcpTransport.hpp"
#include "aegis/die/events/EventDispatcher.hpp"
#include "aegis/die/statistics/NodeStatistics.hpp"
#include "aegis/die/logging/StructuredLogger.hpp"

namespace aegis::die::runtime {

namespace {

class KernelContextImpl : public kernel::KernelContext {
public:
  explicit KernelContextImpl(const kernel::KernelConfig& c) : m_config(c) {}
  const kernel::KernelConfig& getConfig() const override { return m_config; }
  const kernel::KernelVersion& getVersion() const override { return m_version; }
  void logMessage(const std::string& level, const std::string& component, const std::string& message) override {
    logging::StructuredLogger::log(level, component, message);
  }
private:
  kernel::KernelConfig m_config;
  kernel::KernelVersion m_version;
};

class RuntimeContextImpl : public RuntimeContext {
public:
  explicit RuntimeContextImpl(const RuntimeConfiguration& config)
    : m_config(config),
      m_kernelCtx(std::make_shared<KernelContextImpl>(kernel::KernelConfig{config.node.nodeName, "./workspace", config.discovery.bootstrapNodes, config.discovery.allowDiscovery})),
      m_nodeReg(registry::createNodeRegistry()),
      m_roleReg(registry::createRoleRegistry()),
      m_capReg(registry::createCapabilityRegistry()),
      m_resReg(registry::createResourceRegistry()),
      m_msgBus(std::make_shared<messaging::MessageBus>()),
      m_eventDispatcher(std::make_shared<events::EventDispatcher>()),
      m_stats(std::make_shared<statistics::NodeStatistics>()) {
      m_transport = std::make_shared<transport::TcpTransport>(config.transport.host, config.transport.port);
  }

  const RuntimeConfiguration& getRuntimeConfig() const override { return m_config; }
  std::shared_ptr<kernel::KernelContext> getKernelContext() override { return m_kernelCtx; }
  
  std::shared_ptr<registry::NodeRegistry> getNodeRegistry() override { return m_nodeReg; }
  std::shared_ptr<registry::RoleRegistry> getRoleRegistry() override { return m_roleReg; }
  std::shared_ptr<registry::CapabilityRegistry> getCapabilityRegistry() override { return m_capReg; }
  std::shared_ptr<registry::ResourceRegistry> getResourceRegistry() override { return m_resReg; }
  
  std::shared_ptr<communication::ICommunication> getCommunication() override { return nullptr; }
  std::shared_ptr<transport::ITransport> getTransport() override { return m_transport; }
  std::shared_ptr<events::EventDispatcher> getEventDispatcher() override { return m_eventDispatcher; }
  
  std::shared_ptr<statistics::NodeStatistics> getStatistics() override { return m_stats; }
  
  void log(const std::string& level, const std::string& component, const std::string& message) override {
    logging::StructuredLogger::log(level, component, message);
  }

private:
  RuntimeConfiguration m_config;
  std::shared_ptr<KernelContextImpl> m_kernelCtx;
  std::shared_ptr<registry::NodeRegistry> m_nodeReg;
  std::shared_ptr<registry::RoleRegistry> m_roleReg;
  std::shared_ptr<registry::CapabilityRegistry> m_capReg;
  std::shared_ptr<registry::ResourceRegistry> m_resReg;
  std::shared_ptr<messaging::MessageBus> m_msgBus;
  std::shared_ptr<transport::TcpTransport> m_transport;
  std::shared_ptr<events::EventDispatcher> m_eventDispatcher;
  std::shared_ptr<statistics::NodeStatistics> m_stats;
};

} // namespace

DistributedRuntime::DistributedRuntime(const RuntimeConfiguration& config)
  : m_config(config),
    m_state(RuntimeState::OFFLINE),
    m_running(false) {}

DistributedRuntime::~DistributedRuntime() {
  shutdown();
}

void DistributedRuntime::boot() {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_running) return;

  m_state = RuntimeState::STARTING;
  m_context = std::make_shared<RuntimeContextImpl>(m_config);
  m_context->log("INFO", "Runtime", "Boot sequence initiated for " + m_config.node.nodeName);

  m_state = RuntimeState::INITIALIZING;
  
  if (m_context->getTransport()) {
    m_context->log("INFO", "Runtime", "Starting TCP transport layer...");
    m_context->getTransport()->start();
  }

  m_running = true;
  m_state = RuntimeState::ONLINE;
  m_context->log("INFO", "Runtime", "Boot sequence completed. State: ONLINE");
}

void DistributedRuntime::shutdown() {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (!m_running) return;

  m_state = RuntimeState::STOPPING;
  m_context->log("INFO", "Runtime", "Shutdown sequence initiated for " + m_config.node.nodeName);

  if (m_context->getTransport()) {
    m_context->log("INFO", "Runtime", "Stopping TCP transport layer...");
    m_context->getTransport()->stop();
  }

  m_running = false;
  m_state = RuntimeState::OFFLINE;
}

bool DistributedRuntime::isRunning() const {
  return m_running;
}

std::shared_ptr<RuntimeContext> DistributedRuntime::getContext() const {
  return m_context;
}

RuntimeState DistributedRuntime::getState() const {
  return m_state;
}

} // namespace aegis::die::runtime
