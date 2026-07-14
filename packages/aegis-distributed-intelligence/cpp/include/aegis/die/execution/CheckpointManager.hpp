#pragma once
#include "../common/Types.hpp"
#include <string>
#include <map>
#include <mutex>
#include <vector>

namespace aegis::die::execution {

struct Checkpoint {
  std::string checkpointId;
  common::TaskID taskId;
  int version = 0;
  std::string stateData;
  uint64_t timestampMs = 0;
};

class CheckpointManager {
public:
  CheckpointManager() = default;
  ~CheckpointManager() = default;

  void saveCheckpoint(const Checkpoint& cp);
  bool getLatestCheckpoint(const common::TaskID& taskId, Checkpoint& outCp) const;
  void clearCheckpoints(const common::TaskID& taskId);
  void garbageCollect(uint64_t maxAgeMs);

private:
  std::map<common::TaskID, std::vector<Checkpoint>> m_checkpoints;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::execution
