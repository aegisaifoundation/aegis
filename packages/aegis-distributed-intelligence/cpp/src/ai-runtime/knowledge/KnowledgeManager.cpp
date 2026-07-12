#include "../runtime/AIRuntimeComponents.hpp"

namespace aegis::air {

void KnowledgeManager::addFact(const std::string& key, const std::string& val) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_facts[key] = val;
}

std::string KnowledgeManager::queryFact(const std::string& key) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_facts.find(key);
  return (it != m_facts.end()) ? it->second : "";
}

} // namespace aegis::air
