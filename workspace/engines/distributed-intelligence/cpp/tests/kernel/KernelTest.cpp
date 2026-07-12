#include "../TestHelper.hpp"
#include "aegis/die/kernel/Kernel.hpp"
#include "aegis/die/kernel/KernelContext.hpp"

namespace {
class MockKernelContext : public aegis::die::kernel::KernelContext {
public:
  const aegis::die::kernel::KernelConfig& getConfig() const override { return config; }
  const aegis::die::kernel::KernelVersion& getVersion() const override { return version; }
  void logMessage(const std::string& level, const std::string& component, const std::string& message) override {
    logs.push_back(level + ":" + component + ":" + message);
  }
  
  aegis::die::kernel::KernelConfig config;
  aegis::die::kernel::KernelVersion version;
  std::vector<std::string> logs;
};
}

DIE_TEST(KernelContextAndConfigTest) {
  auto context = std::make_shared<MockKernelContext>();
  DIE_ASSERT(context->getConfig().nodeName == "aegis-die-node");
  DIE_ASSERT(context->getVersion().apiVersion.major == 1);
  
  context->logMessage("INFO", "test", "Hello World");
  DIE_ASSERT(context->logs.size() == 1);
}
