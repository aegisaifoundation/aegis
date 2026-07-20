#pragma once
#include "ModelMetadata.hpp"
#include <vector>
#include <string>
#include <mutex>
#include <unordered_map>

namespace aegis::dis {

class ModelRegistry {
public:
  ModelRegistry() = default;
  void registerModel(const ModelMetadata& metadata);
  void unregisterModel(const std::string& name);
  bool getModelMetadata(const std::string& name, ModelMetadata& outMeta) const;
  std::vector<ModelMetadata> listModels() const;

private:
  mutable std::mutex m_mutex;
  std::unordered_map<std::string, ModelMetadata> m_models;
};

} // namespace aegis::dis
