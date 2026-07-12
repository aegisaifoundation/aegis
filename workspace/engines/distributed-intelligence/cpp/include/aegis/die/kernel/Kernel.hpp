#pragma once
#include "KernelContext.hpp"
#include <memory>

namespace aegis::die::kernel {

class Kernel {
public:
  virtual ~Kernel() = default;
  virtual void boot(std::shared_ptr<KernelContext> context) = 0;
  virtual void shutdown() = 0;
  virtual bool isRunning() const = 0;
};

} // namespace aegis::die::kernel
