#pragma once
#include <string>
#include <vector>
#include <memory>
#include <mutex>

namespace aegis::die::plugins {

class PluginManager {
public:
  PluginManager() = default;
  ~PluginManager() { unloadAll(); }

  bool loadPlugin(const std::string& path);
  void unloadAll();

private:
  std::vector<void*> m_handles;
  std::mutex m_mutex;
};

} // namespace aegis::die::plugins
