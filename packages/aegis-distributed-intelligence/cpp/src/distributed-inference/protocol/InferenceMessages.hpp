#pragma once
#include <string>

namespace aegis::dis {

struct InferenceMessageHeader {
  uint32_t messageId;
  uint8_t version = 1;
  uint8_t flags = 0;
};

struct InferenceRequestMessage {
  InferenceMessageHeader header;
  std::string prompt;
  std::string modelName;
};

} // namespace aegis::dis
