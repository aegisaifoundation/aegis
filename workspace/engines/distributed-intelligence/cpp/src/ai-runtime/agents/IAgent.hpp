#pragma once
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>

namespace aegis::air {

struct AgentMetadata {
  std::string name;
  std::string version;
  std::string description;
  std::string requiredModel;
  std::vector<std::string> requiredTools;
  std::vector<std::string> supportedTasks;
  bool requiredMemory = false;
  int priority = 0;
  int trustLevel = 0;
};

struct AgentResult {
  bool success = false;
  std::string output;
  std::string error;
};

struct CapabilitySet {
  std::vector<std::string> capabilities;
};

struct HealthReport {
  std::string status = "UNKNOWN";
  std::string details;
};

struct AITask;

class IAgent {
public:
  virtual ~IAgent() = default;
  virtual void initialize() = 0;
  virtual void start() = 0;
  virtual void stop() = 0;
  virtual AgentResult execute(const AITask& task) = 0;
  virtual AgentMetadata metadata() const = 0;
  virtual CapabilitySet capabilities() const = 0;
  virtual HealthReport health() const = 0;
};

class AgentRegistry {
public:
  AgentRegistry() = default;
  void registerAgent(std::shared_ptr<IAgent> agent);
  void unregisterAgent(const std::string& name);
  std::shared_ptr<IAgent> lookupAgent(const std::string& name) const;
  std::vector<std::shared_ptr<IAgent>> searchByCapability(const std::string& capability) const;
  std::vector<std::shared_ptr<IAgent>> listAgents() const;
private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, std::shared_ptr<IAgent>> m_agents;
};

class AgentLifecycleManager {
public:
  AgentLifecycleManager() = default;
  void initializeAgent(std::shared_ptr<IAgent> agent);
  void startAgent(std::shared_ptr<IAgent> agent);
  void stopAgent(std::shared_ptr<IAgent> agent);
  HealthReport checkAgentHealth(std::shared_ptr<IAgent> agent);
};

class AgentFactory {
public:
  static std::shared_ptr<IAgent> createAgent(const std::string& type, const std::string& name);
};

} // namespace aegis::air
