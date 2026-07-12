#pragma once
#include "../common/Types.hpp"
#include <string>
#include <map>

namespace aegis::die::tasks {

struct Task {
  common::TaskID taskId;
  std::string taskType;
  common::Priority priority = 0;
  common::NodeID owner;
  common::NodeID assignedNode;
  common::Status status = common::Status::PENDING;
  std::map<std::string, std::string> requirements;
  common::Timestamp deadline;
  std::map<std::string, std::string> metadata;
};

} // namespace aegis::die::tasks
