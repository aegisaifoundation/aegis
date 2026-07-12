#pragma once
#include "../api/InferenceRequest.hpp"
#include <string>

namespace aegis::dis {

struct InferenceResult {
  bool success = false;
  std::string text;
  std::string error;
};

class IInferenceBackend {
public:
  virtual ~IInferenceBackend() = default;
  virtual void initialize() = 0;
  virtual void loadModel() = 0;
  virtual void unloadModel() = 0;
  virtual InferenceResult generate(const InferenceRequest& req) = 0;
};

} // namespace aegis::dis
