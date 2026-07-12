#pragma once
#include "../messages/Message.hpp"

namespace aegis::die::messaging {

class MessageDispatcher {
public:
  virtual ~MessageDispatcher() = default;
  virtual void dispatch(const messages::Message& msg) = 0;
};

} // namespace aegis::die::messaging
