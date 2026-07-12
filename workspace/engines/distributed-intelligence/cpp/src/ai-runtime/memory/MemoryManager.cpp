#include "../runtime/AIRuntimeComponents.hpp"

namespace aegis::air {

void MemoryManager::saveMessage(const std::string& sessionId, const std::string& msg) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_history[sessionId].push_back(msg);
}

std::vector<std::string> MemoryManager::getHistory(const std::string& sessionId) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_history.find(sessionId);
  if (it != m_history.end()) {
    return it->second;
  }
  return {};
}

} // namespace aegis::air
