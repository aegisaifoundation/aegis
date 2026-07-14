#include "aegis/die/execution/CheckpointManager.hpp"
#include <chrono>
#include <algorithm>

namespace aegis::die::execution {

static uint64_t current_time_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()).count();
}

void CheckpointManager::saveCheckpoint(const Checkpoint& cp) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto& list = m_checkpoints[cp.taskId];
  Checkpoint cpCopy = cp;
  if (cpCopy.timestampMs == 0) {
    cpCopy.timestampMs = current_time_ms();
  }
  if (cpCopy.version == 0) {
    cpCopy.version = list.empty() ? 1 : list.back().version + 1;
  }
  list.push_back(cpCopy);
}

bool CheckpointManager::getLatestCheckpoint(const common::TaskID& taskId, Checkpoint& outCp) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_checkpoints.find(taskId);
  if (it != m_checkpoints.end() && !it->second.empty()) {
    outCp = it->second.back();
    return true;
  }
  return false;
}

void CheckpointManager::clearCheckpoints(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_checkpoints.erase(taskId);
}

void CheckpointManager::garbageCollect(uint64_t maxAgeMs) {
  std::lock_guard<std::mutex> lock(m_mutex);
  uint64_t limit = current_time_ms() - maxAgeMs;
  for (auto it = m_checkpoints.begin(); it != m_checkpoints.end(); ) {
    auto& list = it->second;
    list.erase(std::remove_if(list.begin(), list.end(), [limit](const Checkpoint& cp) {
      return cp.timestampMs < limit;
    }), list.end());
    
    if (list.empty()) {
      it = m_checkpoints.erase(it);
    } else {
      ++it;
    }
  }
}

} // namespace aegis::die::execution
