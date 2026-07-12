#include "InferenceComponents.hpp"

namespace aegis::dis {

void SessionPool::releaseSession(std::shared_ptr<InferenceSession> session) {
  if (!session) return;
  std::lock_guard<std::mutex> lock(m_mutex);
  m_pool[session->getSessionId()] = session;
}

std::shared_ptr<InferenceSession> SessionPool::acquireSession(const std::string& sessionId, std::shared_ptr<IInferenceBackend> backend) {
  std::lock_guard<std::mutex> lock(m_mutex);
  auto it = m_pool.find(sessionId);
  if (it != m_pool.end()) {
    auto session = it->second;
    m_pool.erase(it);
    return session;
  }
  return std::make_shared<InferenceSession>(sessionId, backend);
}

} // namespace aegis::dis
