#include "aegis/die/messaging/MessageBus.hpp"

namespace aegis::die::messaging {

void MessageBus::registerRoute(const std::string& messageType, Handler handler) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_routes[messageType] = handler;
}

void MessageBus::route(const messages::Message& msg) {
  Handler handler;
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_routes.find(msg.messageType);
    if (it != m_routes.end()) {
      handler = it->second;
    }
  }
  if (handler) {
    handler(msg);
  }
}

void MessageBus::dispatch(const messages::Message& msg) {
  route(msg);
}

} // namespace aegis::die::messaging
