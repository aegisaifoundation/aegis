#pragma once
#include <string>

namespace aegis::die::lifecycle {

class IService {
public:
  virtual ~IService() = default;
  virtual void initialize() = 0;
  virtual void start() = 0;
  virtual void stop() = 0;
  virtual void shutdown() = 0;
  virtual std::string health() = 0;
  virtual std::string statistics() = 0;
};

} // namespace aegis::die::lifecycle
