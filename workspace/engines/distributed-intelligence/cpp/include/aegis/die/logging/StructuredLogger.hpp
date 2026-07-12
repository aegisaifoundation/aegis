#pragma once
#include <iostream>
#include <string>
#include <mutex>
#include "../common/Types.hpp"

namespace aegis::die::logging {

class StructuredLogger {
public:
  static void log(const std::string& level, const std::string& component, const std::string& message) {
    static std::mutex logMutex;
    std::lock_guard<std::mutex> lock(logMutex);
    std::cout << "[" << level << "] [" << component << "] " << message << std::endl;
  }
};

} // namespace aegis::die::logging
