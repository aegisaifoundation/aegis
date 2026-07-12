#pragma once
#include "../common/Types.hpp"
#include <string>
#include <functional>

namespace aegis::die::transport {

class ITransport {
public:
  using MessageHandler = std::function<void(const std::string& sender, const std::string& payload)>;

  virtual ~ITransport() = default;
  virtual void start() = 0;
  virtual void stop() = 0;
  virtual bool isConnected() const = 0;
  
  virtual void send(const std::string& destination, const std::string& payload) = 0;
  virtual void registerMessageHandler(MessageHandler handler) = 0;
};

} // namespace aegis::die::transport
