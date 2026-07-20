#pragma once
#include "ModelRegistry.hpp"
#include "../backend/IInferenceBackend.hpp"
#include <memory>
#include <string>
#include <mutex>
#include <unordered_map>

namespace aegis::dis {

class ModelManager {
public:
  explicit ModelManager(std::shared_ptr<ModelRegistry> registry)
    : m_registry(registry) {}
  
  ~ModelManager() = default;

  std::shared_ptr<IInferenceBackend> getOrLoadBackend(const std::string& modelName);
  void unloadBackend(const std::string& modelName);

private:
  std::shared_ptr<ModelRegistry> m_registry;
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, std::shared_ptr<IInferenceBackend>> m_loadedBackends;
};

} // namespace aegis::dis
