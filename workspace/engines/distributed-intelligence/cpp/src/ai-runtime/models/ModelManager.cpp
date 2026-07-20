#include "../runtime/AIRuntimeComponents.hpp"
#include <algorithm>

namespace aegis::air {

std::string InferenceSession::infer(const std::string& prompt) {
  return "Model output for prompt: " + prompt;
}

void ModelManager::registerModel(const std::string& name) {
  if (std::find(m_models.begin(), m_models.end(), name) == m_models.end()) {
    m_models.push_back(name);
  }
}

std::shared_ptr<InferenceSession> ModelManager::loadModel(const std::string& name) {
  registerModel(name);
  return std::make_shared<InferenceSession>(name);
}

} // namespace aegis::air
