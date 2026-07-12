#pragma once
#include "MessageRouter.hpp"
#include "MessageDispatcher.hpp"
#include "../common/Types.hpp"
#include <map>
#include <mutex>
#include <string>

namespace aegis::die::messaging {

class MessageBus : public MessageRouter, public MessageDispatcher {
public:
  void registerRoute(const std::string& messageType, Handler handler) override;
  void route(const messages::Message& msg) override;
  void dispatch(const messages::Message& msg) override;

private:
  std::map<std::string, Handler> m_routes;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::messaging
