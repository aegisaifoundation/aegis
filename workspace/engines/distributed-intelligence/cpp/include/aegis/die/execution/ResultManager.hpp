#pragma once
#include "../common/Types.hpp"
#include <string>
#include <map>
#include <mutex>
#include <vector>
#include <functional>

namespace aegis::die::execution {

struct TaskResult {
  common::TaskID taskId;
  std::string resultData;
  bool success = false;
  std::string errorMessage;
  double durationMs = 0.0;
  std::vector<std::string> partialOutputs;
};

class ResultManager {
public:
  ResultManager() = default;
  ~ResultManager() = default;

  void addPartialOutput(const common::TaskID& taskId, const std::string& output);
  void setFinalResult(const common::TaskID& taskId, const std::string& result, bool success, const std::string& error = "", double durationMs = 0.0);
  
  bool getResult(const common::TaskID& taskId, TaskResult& outResult) const;
  
  void registerStreamingCallback(const common::TaskID& taskId, std::function<void(const std::string&)> callback);
  void clearCallbacks(const common::TaskID& taskId);

private:
  std::map<common::TaskID, TaskResult> m_results;
  std::map<common::TaskID, std::vector<std::function<void(const std::string&)>>> m_callbacks;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::execution
