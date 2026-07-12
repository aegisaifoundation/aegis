#pragma once
#include <string>

namespace aegis::dis {

struct InferenceResponse {
  std::string text;
  bool success = false;
  std::string error;
  double tokensPerSec = 0.0;
  double latencyMs = 0.0;
};

} // namespace aegis::dis
