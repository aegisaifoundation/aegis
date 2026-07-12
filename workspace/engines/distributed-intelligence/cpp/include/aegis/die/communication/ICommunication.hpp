#pragma once
#include "../transport/ITransport.hpp"
#include <memory>

namespace aegis::die::messages {
struct Message;
}

namespace aegis::die::communication {

class ICommunication {
public:
  virtual ~ICommunication() = default;
  virtual void sendMessage(const messages::Message& msg) = 0;
  virtual void broadcastMessage(const messages::Message& msg) = 0;
  virtual void addTransport(std::shared_ptr<transport::ITransport> transport) = 0;
};

} // namespace aegis::die::communication
