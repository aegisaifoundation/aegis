#include "ModelManager.hpp"
#include <iostream>

namespace aegis::dis {

// Forward declarations of concrete backend factories
std::shared_ptr<IInferenceBackend> createLlamaBackend();
std::shared_ptr<IInferenceBackend> createOnnxBackend();
std::shared_ptr<IInferenceBackend> createTensorRTBackend();

std::shared_ptr<IInferenceBackend> ModelManager::getOrLoadBackend(const std::string& modelName) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_loadedBackends.find(modelName);
  if (it != m_loadedBackends.end()) {
    return it->second;
  }

  ModelMetadata meta;
  if (!m_registry->getModelMetadata(modelName, meta)) {
    // If not registered, create default llama backend
    meta.backend = "llama";
  }

  std::shared_ptr<IInferenceBackend> backend;
  if (meta.backend == "llama") {
    backend = createLlamaBackend();
  } else if (meta.backend == "onnx") {
    backend = createOnnxBackend();
  } else if (meta.backend == "tensorrt") {
    backend = createTensorRTBackend();
  } else {
    backend = createLlamaBackend(); // default fallback
  }

  if (backend) {
    backend->initialize();
    backend->loadModel();
    m_loadedBackends[modelName] = backend;
    std::cout << "[ModelManager] Loaded backend '" << meta.backend << "' for model: " << modelName << std::endl;
  }

  return backend;
}

void ModelManager::unloadBackend(const std::string& modelName) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_loadedBackends.find(modelName);
  if (it != m_loadedBackends.end()) {
    it->second->unloadModel();
    m_loadedBackends.erase(it);
    std::cout << "[ModelManager] Unloaded model: " << modelName << std::endl;
  }
}

} // namespace aegis::dis
