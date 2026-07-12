#pragma once
#include "../common/Types.hpp"
#include <string>

namespace aegis::die::consensus {

struct Vote {
  common::NodeID voter;
  common::NodeID candidate;
  uint64_t term = 0;
  bool approved = false;
  std::string signature;
};

} // namespace aegis::die::consensus
