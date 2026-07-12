#pragma once
#include <string>
#include "../configuration/NodeConfiguration.hpp"
#include "../configuration/DiscoveryConfiguration.hpp"
#include "../configuration/ResourceConfiguration.hpp"
#include "../configuration/SecurityConfiguration.hpp"

namespace aegis::die::runtime {

struct TransportConfiguration {
  std::string host = "127.0.0.1";
  int port = 9001;
};

struct HeartbeatConfiguration {
  int heartbeatIntervalMs = 2000;
  int heartbeatTimeoutMs = 6000;
};

struct LoggingConfiguration {
  std::string logLevel = "INFO";
  std::string logFilePath = "aegis-die-runtime.log";
};

struct RuntimeConfiguration {
  std::string runtimeVersion = "1.0.0";
  std::string protocolVersion = "1.0.0";
  
  configuration::NodeConfiguration node;
  TransportConfiguration transport;
  HeartbeatConfiguration heartbeat;
  configuration::DiscoveryConfiguration discovery;
  LoggingConfiguration logging;
  
  bool shutdownGracefully = true;
  int shutdownTimeoutMs = 5000;
};

} // namespace aegis::die::runtime
