#pragma once
#include <string>
#include <chrono>
#include <cstdint>

namespace aegis::die::common {

using NodeID = std::string;
using ClusterID = std::string;
using TaskID = std::string;
using Timestamp = std::chrono::system_clock::time_point;
using Duration = std::chrono::milliseconds;
using ByteSize = uint64_t;
using Percentage = double;
using Priority = int;

enum class Status {
  SUCCESS,
  FAILURE,
  PENDING,
  RUNNING,
  UNKNOWN
};

inline Timestamp now() {
  return std::chrono::system_clock::now();
}

inline uint64_t to_ms(Timestamp ts) {
  return std::chrono::duration_cast<std::chrono::milliseconds>(ts.time_since_epoch()).count();
}

} // namespace aegis::die::common
