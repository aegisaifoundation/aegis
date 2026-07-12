#pragma once
#include <thread>
#include <vector>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <atomic>

namespace aegis::die::scheduler {

class WorkerPool {
public:
  explicit WorkerPool(size_t threadCount = 4);
  ~WorkerPool();

  void enqueue(std::function<void()> task);
  void stop();

private:
  std::vector<std::thread> m_workers;
  std::queue<std::function<void()>> m_tasks;
  std::mutex m_queueMutex;
  std::condition_variable m_cv;
  std::atomic<bool> m_stop;
};

} // namespace aegis::die::scheduler
