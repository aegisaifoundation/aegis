#pragma once
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <atomic>
#include "../tasks/AITask.hpp"

namespace aegis::air {

// Memory Manager
class MemoryManager {
public:
  MemoryManager() = default;
  void saveMessage(const std::string& sessionId, const std::string& msg);
  std::vector<std::string> getHistory(const std::string& sessionId) const;
private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, std::vector<std::string>> m_history;
};

// Knowledge Manager
class KnowledgeManager {
public:
  KnowledgeManager() = default;
  void addFact(const std::string& key, const std::string& val);
  std::string queryFact(const std::string& key) const;
private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, std::string> m_facts;
};

// Prompt Manager
class PromptManager {
public:
  PromptManager() = default;
  void registerTemplate(const std::string& name, const std::string& temp);
  std::string render(const std::string& name, const std::unordered_map<std::string, std::string>& vars) const;
private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, std::string> m_templates;
};

// Context Manager
class ContextManager {
public:
  ContextManager() = default;
  void enforceBudget(const std::string& contextText, size_t maxTokens);
};

// Tool Runtime
class ToolRuntime {
public:
  ToolRuntime() = default;
  std::string executeTool(const std::string& toolName, const std::string& args);
};

// AI Services
class IAIService {
public:
  virtual ~IAIService() = default;
  virtual void startService() = 0;
  virtual void stopService() = 0;
};

class AIServiceManager {
public:
  AIServiceManager() = default;
  void loadService(const std::string& name, std::shared_ptr<IAIService> svc);
private:
  std::unordered_map<std::string, std::shared_ptr<IAIService>> m_services;
};

// Metrics
class AIRuntimeMetrics {
public:
  AIRuntimeMetrics() : m_tasksExecuted(0), m_errors(0) {}
  void recordTask() { m_tasksExecuted++; }
  void recordError() { m_errors++; }
  int getTasksCount() const { return m_tasksExecuted; }
private:
  std::atomic<int> m_tasksExecuted;
  std::atomic<int> m_errors;
};

// Policy Manager
class PolicyManager {
public:
  PolicyManager() = default;
  bool isRemoteAllowed(PrivacyLevel level) const {
    return level == PrivacyLevel::PUBLIC; // Only public data can leave
  }
};

// Trust Manager
class TrustManager {
public:
  TrustManager() = default;
  bool isNodeTrusted(const std::string& nodeId) const { return true; }
};

// Model Manager
class InferenceSession {
public:
  InferenceSession(const std::string& modelName) : m_modelName(modelName) {}
  std::string infer(const std::string& prompt);
private:
  std::string m_modelName;
};

class ModelManager {
public:
  ModelManager() = default;
  void registerModel(const std::string& name);
  std::shared_ptr<InferenceSession> loadModel(const std::string& name);
private:
  std::vector<std::string> m_models;
};

} // namespace aegis::air
