#pragma once
#include "NodeEvent.hpp"
#include <queue>
#include <mutex>
#include <condition_variable>
#include <chrono>

namespace aegis::die::events {

class EventQueue {
public:
  void push(const NodeEvent& event) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_queue.push(event);
    m_cv.notify_one();
  }

  bool pop(NodeEvent& event, std::chrono::milliseconds timeout) {
    std::unique_lock<std::mutex> lock(m_mutex);
    if (m_queue.empty()) {
      if (m_cv.wait_for(lock, timeout) == std::cv_status::timeout) {
        return false;
      }
    }
    if (m_queue.empty()) return false;
    event = m_queue.front();
    m_queue.pop();
    return true;
  }

  bool empty() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_queue.empty();
  }

private:
  std::queue<NodeEvent> m_queue;
  mutable std::mutex m_mutex;
  std::condition_variable m_cv;
};

} // namespace aegis::die::events
