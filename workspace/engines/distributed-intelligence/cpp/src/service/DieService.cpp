#include "aegis/die/runtime/DistributedRuntime.hpp"
#include "aegis/die/runtime/RuntimeConfiguration.hpp"
#include <iostream>
#include <string>
#include <csignal>
#include <atomic>
#include <thread>
#include <chrono>

// ============================================================
// AEGIS Distributed Intelligence Engine — Standalone Service
//
// This is the Runtime-managed entry-point for the DIE.
// It is NOT a test runner. It is NOT a demo.
//
// Lifecycle:
//   1. Parse optional CLI arguments (--port, --node-name)
//   2. Boot the DistributedRuntime
//   3. Print AEGIS_DIE_READY to stdout (TypeScript adapter listens)
//   4. Block until SIGTERM, SIGINT, or stdin is closed
//   5. Call shutdown()
//   6. Print AEGIS_DIE_STOPPED to stdout and exit 0
// ============================================================

static std::atomic<bool> g_shutdown_requested{false};

#ifdef _WIN32
#include <windows.h>
BOOL WINAPI console_ctrl_handler(DWORD dwCtrlType) {
  if (dwCtrlType == CTRL_C_EVENT || dwCtrlType == CTRL_BREAK_EVENT || dwCtrlType == CTRL_CLOSE_EVENT) {
    g_shutdown_requested.store(true);
    return TRUE;
  }
  return FALSE;
}
#else
static void signal_handler(int sig) {
  g_shutdown_requested.store(true);
}
#endif

static std::string get_arg(int argc, char** argv, const std::string& flag, const std::string& fallback) {
  for (int i = 1; i < argc - 1; ++i) {
    if (std::string(argv[i]) == flag) {
      return argv[i + 1];
    }
  }
  return fallback;
}

int main(int argc, char** argv) {
  // 1. Parse CLI arguments
  const std::string nodeId = get_arg(argc, argv, "--node-id", "");
  const std::string nodeName = get_arg(argc, argv, "--node-name", "aegis-die-node");
  const int port = std::stoi(get_arg(argc, argv, "--port", "9900"));

  if (nodeId.empty()) {
    std::cerr << "[Distributed Intelligence] Fatal: Mandatory argument --node-id is missing or empty." << std::endl;
    return 1;
  }

  // 2. Register platform shutdown signals
#ifdef _WIN32
  SetConsoleCtrlHandler(console_ctrl_handler, TRUE);
#else
  std::signal(SIGTERM, signal_handler);
  std::signal(SIGINT,  signal_handler);
#endif

  // 3. Configure the DistributedRuntime
  aegis::die::runtime::RuntimeConfiguration config;
  config.node.nodeId = nodeId;
  config.node.nodeName = nodeName;
  config.transport.host = "0.0.0.0";
  config.transport.port = port;
  config.discovery.allowDiscovery = true;

  // 4. Boot the runtime
  aegis::die::runtime::DistributedRuntime runtime(config);
  try {
    runtime.boot();
  } catch (const std::exception& e) {
    std::cerr << "[Distributed Intelligence] Boot failed: " << e.what() << std::endl;
    return 1;
  }

  // 5. Signal readiness — TypeScript adapter waits for this line on stdout
  std::cout << "AEGIS_DIE_READY" << std::endl;
  std::cout.flush();

  // 6. Block until shutdown is requested or stdin is closed
  // The TypeScript adapter closes stdin on shutdown — detect that too.
  std::thread stdin_watcher([]() {
    std::string line;
    while (std::getline(std::cin, line)) {
      if (line == "SHUTDOWN") {
        g_shutdown_requested.store(true);
        return;
      }
    }
    // stdin closed (parent process exited)
    g_shutdown_requested.store(true);
  });
  stdin_watcher.detach();

  while (!g_shutdown_requested.load()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  // 7. Graceful shutdown
  try {
    runtime.shutdown();
  } catch (const std::exception& e) {
    std::cerr << "[Distributed Intelligence] Shutdown error: " << e.what() << std::endl;
  }

  // 8. Signal clean exit — TypeScript adapter listens for this
  std::cout << "AEGIS_DIE_STOPPED" << std::endl;
  std::cout.flush();

  return 0;
}
