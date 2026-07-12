#pragma once
#include "../common/Types.hpp"

namespace aegis::die::configuration {

struct ResourceConfiguration {
  common::Percentage maxCpuLimit = 80.0;
  common::Percentage maxGpuLimit = 80.0;
  common::ByteSize maxMemoryBytes = 0;
  common::ByteSize maxStorageBytes = 0;
};

} // namespace aegis::die::configuration
