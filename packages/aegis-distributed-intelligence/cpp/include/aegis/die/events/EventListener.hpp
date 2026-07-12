#pragma once
#include "NodeEvent.hpp"
#include <functional>

namespace aegis::die::events {

class EventListener {
public:
  using Callback = std::function<void(const NodeEvent&)>;

  explicit EventListener(Callback cb) : m_callback(cb) {}

  void onEvent(const NodeEvent& event) const {
    if (m_callback) {
      m_callback(event);
    }
  }

private:
  Callback m_callback;
};

} // namespace aegis::die::events
