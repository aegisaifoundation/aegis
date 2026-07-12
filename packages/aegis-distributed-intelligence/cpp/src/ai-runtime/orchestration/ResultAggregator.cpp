#include "Orchestrator.hpp"

namespace aegis::air {

void ResultAggregator::addResult(const std::string& taskId, const AgentResult& result) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_results[taskId] = result;
}

std::string ResultAggregator::getCombinedOutput() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::string combined;
  for (const auto& [id, res] : m_results) {
    combined += "[" + id + "]: ";
    if (res.success) {
      combined += res.output;
    } else {
      combined += "FAILED (" + res.error + ")";
    }
    combined += "\n";
  }
  return combined;
}

} // namespace aegis::air
