#pragma once
#include "IAgent.hpp"

namespace aegis::air {

class AgentBase : public IAgent {
public:
  explicit AgentBase(const AgentMetadata& meta)
    : m_meta(meta), m_running(false) {}

  virtual ~AgentBase() = default;

  void initialize() override {}
  
  void start() override {
    m_running = true;
  }
  
  void stop() override {
    m_running = false;
  }

  AgentMetadata metadata() const override {
    return m_meta;
  }

  CapabilitySet capabilities() const override {
    return CapabilitySet{m_meta.supportedTasks};
  }

  HealthReport health() const override {
    HealthReport hr;
    hr.status = m_running ? "OK" : "STOPPED";
    return hr;
  }

protected:
  AgentMetadata m_meta;
  bool m_running;
};

} // namespace aegis::air
