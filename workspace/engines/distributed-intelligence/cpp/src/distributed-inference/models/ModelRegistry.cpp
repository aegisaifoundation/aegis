#include "ModelRegistry.hpp"

namespace aegis::dis {

void ModelRegistry::registerModel(const ModelMetadata& metadata) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_models[metadata.name] = metadata;
}

void ModelRegistry::unregisterModel(const std::string& name) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_models.erase(name);
}

bool ModelRegistry::getModelMetadata(const std::string& name, ModelMetadata& outMeta) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_models.find(name);
  if (it != m_models.end()) {
    outMeta = it->second;
    return true;
  }
  return false;
}

std::vector<ModelMetadata> ModelRegistry::listModels() const {
  std::lock_guard<std::mutex> lock(m_mutex);
  std::vector<ModelMetadata> list;
  for (const auto& [name, meta] : m_models) {
    list.push_back(meta);
  }
  return list;
}

} // namespace aegis::dis
