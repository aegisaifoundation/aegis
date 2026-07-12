#include "aegis/die/events/EventDispatcher.hpp"

namespace aegis::die::events {

void EventDispatcher::subscribe(EventType type, std::shared_ptr<EventListener> listener) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_subscribers[type].push_back(listener);
}

void EventDispatcher::unsubscribe(EventType type, std::shared_ptr<EventListener> listener) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_subscribers.find(type);
  if (it != m_subscribers.end()) {
    auto& list = it->second;
    for (auto listIt = list.begin(); listIt != list.end(); ++listIt) {
      if (*listIt == listener) {
        list.erase(listIt);
        break;
      }
    }
  }
}

void EventDispatcher::dispatch(const NodeEvent& event) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_subscribers.find(event.type);
  if (it != m_subscribers.end()) {
    for (const auto& listener : it->second) {
      if (listener) {
        listener->onEvent(event);
      }
    }
  }
}

} // namespace aegis::die::events
