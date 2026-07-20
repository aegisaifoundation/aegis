#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace aegis::dis {

struct ModelMetadata {
  std::string name;
  std::string version;
  std::string architecture;
  std::string quantization;
  int contextLength = 2048;
  uint64_t memoryRequirement = 0;
  bool gpuRequired = false;
  std::string backend;
  std::vector<std::string> supportedModalities;
  std::vector<std::string> supportedLanguages;
};

} // namespace aegis::dis
