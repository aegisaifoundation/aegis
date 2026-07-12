#pragma once
#include "KernelConfig.hpp"
#include "KernelVersion.hpp"
#include <memory>

namespace aegis::die::kernel {

class KernelContext {
public:
  virtual ~KernelContext() = default;
  virtual const KernelConfig& getConfig() const = 0;
  virtual const KernelVersion& getVersion() const = 0;
  virtual void logMessage(const std::string& level, const std::string& component, const std::string& message) = 0;
};

} // namespace aegis::die::kernel
