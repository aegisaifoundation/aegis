#pragma once
#include "../api/InferenceRequest.hpp"
#include "../api/InferenceResponse.hpp"
#include "../backend/IInferenceBackend.hpp"
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <functional>

namespace aegis::dis {

class InferenceSession {
public:
  explicit InferenceSession(const std::string& sessionId, std::shared_ptr<IInferenceBackend> backend)
    : m_sessionId(sessionId), m_backend(backend) {}

  InferenceResult run(const InferenceRequest& req) {
    if (m_backend) {
      return m_backend->generate(req);
    }
    InferenceResult res;
    res.success = false;
    res.error = "No active backend driver loaded.";
    return res;
  }

  std::string getSessionId() const { return m_sessionId; }

private:
  std::string m_sessionId;
  std::shared_ptr<IInferenceBackend> m_backend;
};

class SessionPool {
public:
  SessionPool() = default;
  void releaseSession(std::shared_ptr<InferenceSession> session);
  std::shared_ptr<InferenceSession> acquireSession(const std::string& sessionId, std::shared_ptr<IInferenceBackend> backend);

private:
  std::mutex m_mutex;
  std::unordered_map<std::string, std::shared_ptr<InferenceSession>> m_pool;
};

class PromptBuilder {
public:
  PromptBuilder() = default;
  std::string buildPrompt(const std::string& systemPrompt, const std::string& userPrompt, const std::string& contextText) const {
    std::string full;
    if (!systemPrompt.empty()) {
      full += "<|system|>\n" + systemPrompt + "\n";
    }
    if (!contextText.empty()) {
      full += "<|context|>\n" + contextText + "\n";
    }
    full += "<|user|>\n" + userPrompt + "\n<|assistant|>\n";
    return full;
  }
};

class ContextBuilder {
public:
  ContextBuilder() = default;
  std::string assembleContext(const std::vector<std::string>& memoryHistory, const std::string& knowledgeFacts) const {
    std::string context;
    for (const auto& msg : memoryHistory) {
      context += msg + "\n";
    }
    if (!knowledgeFacts.empty()) {
      context += "Relevant Facts:\n" + knowledgeFacts + "\n";
    }
    return context;
  }
};

class TokenStreamer {
public:
  TokenStreamer() = default;
  void streamTokens(const std::string& text, std::function<void(const std::string&)> tokenCallback) {
    if (!tokenCallback) return;
    
    std::string delimiter = " ";
    size_t last = 0;
    size_t next = 0;
    while ((next = text.find(delimiter, last)) != std::string::npos) {
      tokenCallback(text.substr(last, next - last + 1));
      last = next + 1;
    }
    if (last < text.size()) {
      tokenCallback(text.substr(last));
    }
  }
};

class ResponseAssembler {
public:
  ResponseAssembler() = default;
  InferenceResponse assemble(const InferenceResult& rawResult, double latencyMs) const {
    InferenceResponse resp;
    resp.success = rawResult.success;
    resp.text = rawResult.text;
    resp.error = rawResult.error;
    resp.latencyMs = latencyMs;
    if (rawResult.success) {
      resp.tokensPerSec = static_cast<double>(rawResult.text.size()) / 4.0 / (latencyMs / 1000.0);
    }
    return resp;
  }
};

} // namespace aegis::dis
