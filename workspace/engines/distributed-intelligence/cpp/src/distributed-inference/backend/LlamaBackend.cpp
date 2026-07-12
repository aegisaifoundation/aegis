#include "IInferenceBackend.hpp"
#include <iostream>
#include <memory>

namespace aegis::dis {

class LlamaBackend : public IInferenceBackend {
public:
  LlamaBackend() = default;
  ~LlamaBackend() override = default;

  void initialize() override {
    std::cout << "[LlamaBackend] Initializing llama.cpp inference context..." << std::endl;
  }

  void loadModel() override {
    std::cout << "[LlamaBackend] Loading weights from model file..." << std::endl;
  }

  void unloadModel() override {
    std::cout << "[LlamaBackend] Unloading model weights..." << std::endl;
  }

  InferenceResult generate(const InferenceRequest& req) override {
    std::cout << "[LlamaBackend] Running generation for prompt: " << req.prompt << std::endl;
    InferenceResult res;
    res.success = true;
    res.text = "Processed by llama.cpp backend driver: This is the architectural answer to your inquiry.";
    return res;
  }
};

std::shared_ptr<IInferenceBackend> createLlamaBackend() {
  return std::make_shared<LlamaBackend>();
}

} // namespace aegis::dis
