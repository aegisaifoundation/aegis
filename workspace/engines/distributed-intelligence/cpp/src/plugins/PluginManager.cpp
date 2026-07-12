#include "aegis/die/plugins/PluginManager.hpp"
#include <iostream>

#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif

namespace aegis::die::plugins {

bool PluginManager::loadPlugin(const std::string& path) {
  std::lock_guard<std::mutex> lock(m_mutex);
#ifdef _WIN32
  HMODULE handle = LoadLibraryA(path.c_str());
  if (!handle) {
    std::cerr << "[PluginManager] Failed to load DLL: " << path << std::endl;
    return false;
  }
  m_handles.push_back(static_cast<void*>(handle));
#else
  void* handle = dlopen(path.c_str(), RTLD_NOW);
  if (!handle) {
    std::cerr << "[PluginManager] Failed to load shared object: " << dlerror() << std::endl;
    return false;
  }
  m_handles.push_back(handle);
#endif
  return true;
}

void PluginManager::unloadAll() {
  std::lock_guard<std::mutex> lock(m_mutex);
  for (void* handle : m_handles) {
    if (handle) {
#ifdef _WIN32
      FreeLibrary(static_cast<HMODULE>(handle));
#else
      dlclose(handle);
#endif
    }
  }
  m_handles.clear();
}

} // namespace aegis::die::plugins
