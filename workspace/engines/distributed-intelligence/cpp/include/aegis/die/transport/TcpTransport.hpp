#pragma once
#include "ITransport.hpp"
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <cstdint>

namespace aegis::die::transport {

class TcpTransport : public ITransport {
public:
  TcpTransport(const std::string& host, int port);
  ~TcpTransport() override;

  void start() override;
  void stop() override;
  bool isConnected() const override;
  
  void send(const std::string& destination, const std::string& payload) override;
  void registerMessageHandler(MessageHandler handler) override;

private:
  void runServer();
  
  std::string m_host;
  int m_port;
  std::atomic<bool> m_running;
  MessageHandler m_handler;
  std::thread m_serverThread;
  
#ifdef _WIN32
  uintptr_t m_serverFd;
#else
  int m_serverFd;
#endif

  mutable std::mutex m_mutex;
};

} // namespace aegis::die::transport
