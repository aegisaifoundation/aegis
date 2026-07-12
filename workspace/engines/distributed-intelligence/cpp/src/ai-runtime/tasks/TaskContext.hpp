#pragma once
#include <string>
#include <unordered_map>
#include <mutex>

namespace aegis::air {

class TaskContext {
public:
  TaskContext() = default;

  void setVariable(const std::string& key, const std::string& val) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_vars[key] = val;
  }

  std::string getVariable(const std::string& key) const {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_vars.find(key);
    return (it != m_vars.end()) ? it->second : "";
  }

private:
  std::unordered_map<std::string, std::string> m_vars;
  mutable std::mutex m_mutex;
};

} // namespace aegis::air
