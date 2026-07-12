#include "IInferenceBackend.hpp"
#include <iostream>
#include <memory>

namespace aegis::dis {

class OnnxBackend : public IInferenceBackend {
public:
  OnnxBackend() = default;
  ~OnnxBackend() override = default;

  void initialize() override {
    std::cout << "[OnnxBackend] Initializing ONNX Runtime execution session..." << std::endl;
  }

  void loadModel() override {
    std::cout << "[OnnxBackend] Loading ONNX model graph..." << std::endl;
  }

  void unloadModel() override {
    std::cout << "[OnnxBackend] Releasing ONNX model session..." << std::endl;
  }

  InferenceResult generate(const InferenceRequest& req) override {
    std::cout << "[OnnxBackend] Generating tokens on CPU/GPU..." << std::endl;
    InferenceResult res;
    res.success = true;
    res.text = "Processed by ONNX Runtime backend: Structural architectural report.";
    return res;
  }
};

std::shared_ptr<IInferenceBackend> createOnnxBackend() {
  return std::make_shared<OnnxBackend>();
}

} // namespace aegis::dis
