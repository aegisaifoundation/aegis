#ifdef _WIN32
  #ifndef _WIN32_WINNT
    #define _WIN32_WINNT 0x0600
  #endif
#endif
#include "aegis/die/transport/TcpTransport.hpp"
#include <iostream>
#include <sstream>
#include <cstring>
#include <vector>

#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
  using socket_t = SOCKET;
  #define close_socket closesocket
#else
  #include <sys/socket.h>
  #include <netinet/in.h>
  #include <arpa/inet.h>
  #include <unistd.h>
  using socket_t = int;
  #define close_socket close
  #define INVALID_SOCKET -1
#endif

namespace aegis::die::transport {

TcpTransport::TcpTransport(const std::string& host, int port)
  : m_host(host), m_port(port), m_running(false), m_serverFd(INVALID_SOCKET) {
#ifdef _WIN32
    static bool wsaInitialized = false;
    if (!wsaInitialized) {
      WSADATA wsaData;
      WSAStartup(MAKEWORD(2, 2), &wsaData);
      wsaInitialized = true;
    }
#endif
}

TcpTransport::~TcpTransport() {
  stop();
}

void TcpTransport::start() {
  std::lock_guard<std::mutex> lock(m_mutex);
  if (m_running) return;
  m_running = true;

  socket_t server = socket(AF_INET, SOCK_STREAM, 0);
  if (server == INVALID_SOCKET) {
    m_running = false;
    return;
  }

  int opt = 1;
#ifdef _WIN32
  setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));
#else
  setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

  sockaddr_in addr;
  std::memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(m_port);
  inet_pton(AF_INET, m_host.c_str(), &addr.sin_addr);

  if (bind(server, (sockaddr*)&addr, sizeof(addr)) < 0) {
    close_socket(server);
    m_running = false;
    return;
  }

  if (listen(server, 10) < 0) {
    close_socket(server);
    m_running = false;
    return;
  }

  m_serverFd = server;
  m_serverThread = std::thread(&TcpTransport::runServer, this);
}

void TcpTransport::stop() {
  {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_running) return;
    m_running = false;
    if (m_serverFd != INVALID_SOCKET) {
      close_socket(m_serverFd);
      m_serverFd = INVALID_SOCKET;
    }
  }

  if (m_serverThread.joinable()) {
    m_serverThread.join();
  }
}

bool TcpTransport::isConnected() const {
  return m_running;
}

void TcpTransport::send(const std::string& destination, const std::string& payload) {
  auto colonPos = destination.find(':');
  if (colonPos == std::string::npos) return;
  std::string ip = destination.substr(0, colonPos);
  int port = std::stoi(destination.substr(colonPos + 1));

  socket_t client = socket(AF_INET, SOCK_STREAM, 0);
  if (client == INVALID_SOCKET) return;

  sockaddr_in addr;
  std::memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(port);
  inet_pton(AF_INET, ip.c_str(), &addr.sin_addr);

  if (connect(client, (sockaddr*)&addr, sizeof(addr)) >= 0) {
    uint32_t len = htonl(static_cast<uint32_t>(payload.size()));
#ifdef _WIN32
    ::send(client, (const char*)&len, sizeof(len), 0);
    ::send(client, payload.c_str(), static_cast<int>(payload.size()), 0);
#else
    ::send(client, &len, sizeof(len), 0);
    ::send(client, payload.c_str(), payload.size(), 0);
#endif
  }
  close_socket(client);
}

void TcpTransport::registerMessageHandler(MessageHandler handler) {
  std::lock_guard<std::mutex> lock(m_mutex);
  m_handler = handler;
}

void TcpTransport::runServer() {
  socket_t server = m_serverFd;
  while (m_running) {
    fd_set readfds;
    FD_ZERO(&readfds);
    FD_SET(server, &readfds);

    timeval tv;
    tv.tv_sec = 0;
    tv.tv_usec = 100000;

#ifdef _WIN32
    int activity = select(0, &readfds, nullptr, nullptr, &tv);
#else
    int activity = select(server + 1, &readfds, nullptr, nullptr, &tv);
#endif

    if (activity < 0) {
      break;
    }

    if (activity > 0 && FD_ISSET(server, &readfds)) {
      sockaddr_in clientAddr;
      int addrLen = sizeof(clientAddr);
#ifdef _WIN32
      socket_t client = accept(server, (sockaddr*)&clientAddr, &addrLen);
#else
      socket_t client = accept(server, (sockaddr*)&clientAddr, (socklen_t*)&addrLen);
#endif

      if (client != INVALID_SOCKET) {
        char ipBuf[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &clientAddr.sin_addr, ipBuf, sizeof(ipBuf));
        std::string senderIp(ipBuf);
        int senderPort = ntohs(clientAddr.sin_port);
        std::string senderAddr = senderIp + ":" + std::to_string(senderPort);

        uint32_t len = 0;
#ifdef _WIN32
        int bytesRead = recv(client, (char*)&len, sizeof(len), 0);
#else
        int bytesRead = recv(client, &len, sizeof(len), 0);
#endif

        if (bytesRead == sizeof(len)) {
          uint32_t payloadLen = ntohl(len);
          std::vector<char> buffer(payloadLen);
          uint32_t totalBytesReceived = 0;
          
          while (totalBytesReceived < payloadLen) {
#ifdef _WIN32
            int n = recv(client, buffer.data() + totalBytesReceived, static_cast<int>(payloadLen - totalBytesReceived), 0);
#else
            int n = recv(client, buffer.data() + totalBytesReceived, payloadLen - totalBytesReceived, 0);
#endif
            if (n <= 0) break;
            totalBytesReceived += n;
          }

          if (totalBytesReceived == payloadLen) {
            std::string payload(buffer.begin(), buffer.end());
            MessageHandler handlerCopy;
            {
              std::lock_guard<std::mutex> lock(m_mutex);
              handlerCopy = m_handler;
            }
            if (handlerCopy) {
              handlerCopy(senderAddr, payload);
            }
          }
        }
        close_socket(client);
      }
    }
  }
}

} // namespace aegis::die::transport
