#include "aegis/die/scheduler/WorkerPool.hpp"

namespace aegis::die::scheduler {

WorkerPool::WorkerPool(size_t threadCount) : m_stop(false) {
  for (size_t i = 0; i < threadCount; ++i) {
    m_workers.emplace_back([this]() {
      while (true) {
        std::function<void()> task;
        {
          std::unique_lock<std::mutex> lock(this->m_queueMutex);
          this->m_cv.wait(lock, [this]() {
            return this->m_stop || !this->m_tasks.empty();
          });
          if (this->m_stop && this->m_tasks.empty()) {
            return;
          }
          task = std::move(this->m_tasks.front());
          this->m_tasks.pop();
        }
        task();
      }
    });
  }
}

WorkerPool::~WorkerPool() {
  stop();
}

void WorkerPool::enqueue(std::function<void()> task) {
  {
    std::lock_guard<std::mutex> lock(m_queueMutex);
    m_tasks.push(task);
  }
  m_cv.notify_one();
}

void WorkerPool::stop() {
  m_stop = true;
  m_cv.notify_all();
  for (std::thread& worker : m_workers) {
    if (worker.joinable()) {
      worker.join();
    }
  }
  m_workers.clear();
}

} // namespace aegis::die::scheduler
