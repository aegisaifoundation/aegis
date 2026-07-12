#pragma once
#include "../api/InferenceRequest.hpp"
#include "../api/InferenceResponse.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/scheduler/Scheduler.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>

namespace aegis::dis {

class PlacementResolver {
public:
  explicit PlacementResolver(std::shared_ptr<aegis::die::runtime::RuntimeContext> ctx)
    : m_ctx(ctx) {}

  std::string resolveNode(const InferenceRequest& req) {
    if (!m_ctx) return "local";

    auto registry = m_ctx->getNodeRegistry();
    if (!registry) return m_ctx->getRuntimeConfig().node.nodeName;

    auto nodes = registry->listNodes();
    if (nodes.empty()) return m_ctx->getRuntimeConfig().node.nodeName;

    std::vector<aegis::die::node::NodeDescriptor> flatNodes;
    for (const auto& nodePtr : nodes) {
      if (nodePtr) {
        flatNodes.push_back(*nodePtr);
      }
    }

    if (flatNodes.empty()) return m_ctx->getRuntimeConfig().node.nodeName;

    aegis::die::scheduler::Scheduler dirScheduler;
    std::string nodeId = dirScheduler.scheduleTask("inference_" + req.modelName, flatNodes);
    return nodeId.empty() ? m_ctx->getRuntimeConfig().node.nodeName : nodeId;
  }

private:
  std::shared_ptr<aegis::die::runtime::RuntimeContext> m_ctx;
};

class ExecutionAdapter {
public:
  explicit ExecutionAdapter(std::shared_ptr<PlacementResolver> resolver)
    : m_resolver(resolver) {}

  std::string getTargetNode(const InferenceRequest& req) {
    if (m_resolver) {
      return m_resolver->resolveNode(req);
    }
    return "local";
  }

private:
  std::shared_ptr<PlacementResolver> m_resolver;
};

class ResponseCache {
public:
  ResponseCache() = default;
  void put(const std::string& hash, const std::string& text) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_cache[hash] = text;
  }
  bool get(const std::string& hash, std::string& outText) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_cache.find(hash);
    if (it != m_cache.end()) {
      outText = it->second;
      return true;
    }
    return false;
  }
private:
  std::mutex m_mutex;
  std::unordered_map<std::string, std::string> m_cache;
};

class KVCache {
public:
  KVCache() = default;
};

class InferenceMetrics {
public:
  InferenceMetrics() = default;
  void recordInference(double durationMs, size_t tokens) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_totalLatencyMs += durationMs;
    m_totalTokens += tokens;
  }
  double getAverageLatency() {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_totalLatencyMs;
  }
private:
  std::mutex m_mutex;
  double m_totalLatencyMs = 0.0;
  size_t m_totalTokens = 0;
};

} // namespace aegis::dis
