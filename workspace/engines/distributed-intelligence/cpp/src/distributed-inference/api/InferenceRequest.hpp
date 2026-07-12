#pragma once
#include <string>
#include <vector>

namespace aegis::dis {

struct InferenceRequest {
  std::string modelName;
  std::string prompt;
  std::string systemPrompt;
  float temperature = 0.7f;
  int maxTokens = 256;
  std::string sessionId;
};

} // namespace aegis::dis
