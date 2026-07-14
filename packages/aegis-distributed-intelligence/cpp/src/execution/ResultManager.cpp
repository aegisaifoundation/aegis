#include "aegis/die/execution/ResultManager.hpp"

namespace aegis::die::execution {

void ResultManager::addPartialOutput(const common::TaskID& taskId, const std::string& output) {
  std::vector<std::function<void(const std::string&)>> callbacksToTrigger;
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto& res = m_results[taskId];
    res.taskId = taskId;
    res.partialOutputs.push_back(output);

    auto cbIt = m_callbacks.find(taskId);
    if (cbIt != m_callbacks.end()) {
      callbacksToTrigger = cbIt->second;
    }
  }

  for (const auto& cb : callbacksToTrigger) {
    if (cb) {
      cb(output);
    }
  }
}

void ResultManager::setFinalResult(const common::TaskID& taskId, const std::string& result, bool success, const std::string& error, double durationMs) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto& res = m_results[taskId];
  res.taskId = taskId;
  res.resultData = result;
  res.success = success;
  res.errorMessage = error;
  res.durationMs = durationMs;
}

bool ResultManager::getResult(const common::TaskID& taskId, TaskResult& outResult) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_results.find(taskId);
  if (it != m_results.end()) {
    outResult = it->second;
    return true;
  }
  return false;
}

void ResultManager::registerStreamingCallback(const common::TaskID& taskId, std::function<void(const std::string&)> callback) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_callbacks[taskId].push_back(callback);
}

void ResultManager::clearCallbacks(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_callbacks.erase(taskId);
}

} // namespace aegis::die::execution
