#include "../runtime/AIRuntimeComponents.hpp"

namespace aegis::air {

void PromptManager::registerTemplate(const std::string& name, const std::string& temp) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_templates[name] = temp;
}

std::string PromptManager::render(const std::string& name, const std::unordered_map<std::string, std::string>& vars) const {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_templates.find(name);
  if (it == m_templates.end()) return "";

  std::string rendered = it->second;
  for (const auto& [key, val] : vars) {
    std::string placeholder = "{{" + key + "}}";
    size_t pos = 0;
    while ((pos = rendered.find(placeholder, pos)) != std::string::npos) {
      rendered.replace(pos, placeholder.length(), val);
      pos += val.length();
    }
  }
  return rendered;
}

} // namespace aegis::air
