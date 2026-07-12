#pragma once
#include "NodeEvent.hpp"
#include "EventListener.hpp"
#include <vector>
#include <mutex>
#include <map>
#include <memory>

namespace aegis::die::events {

class EventDispatcher {
public:
  void subscribe(EventType type, std::shared_ptr<EventListener> listener);
  void unsubscribe(EventType type, std::shared_ptr<EventListener> listener);
  void dispatch(const NodeEvent& event);

private:
  std::map<EventType, std::vector<std::shared_ptr<EventListener>>> m_subscribers;
  mutable std::mutex m_mutex;
};

} // namespace aegis::die::events
