#pragma once
#include "../messages/Message.hpp"
#include <functional>
#include <string>

namespace aegis::die::messaging {

class MessageRouter {
public:
  using Handler = std::function<void(const messages::Message&)>;

  virtual ~MessageRouter() = default;
  virtual void registerRoute(const std::string& messageType, Handler handler) = 0;
  virtual void route(const messages::Message& msg) = 0;
};

} // namespace aegis::die::messaging
