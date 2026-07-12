#pragma once
#include "../common/Types.hpp"
#include "Vote.hpp"
#include <vector>
#include <string>

namespace aegis::die::consensus {

struct Election {
  std::string electionId;
  uint64_t term = 0;
  std::vector<Vote> votes;
  common::NodeID winner;
  bool isCompleted = false;
};

} // namespace aegis::die::consensus
