#pragma once
#include "../common/Types.hpp"
#include <string>
#include <map>
#include <vector>

namespace aegis::die::tasks {

struct RetryPolicy {
  int maxRetries = 3;
  int retryCount = 0;
  uint64_t backoffMs = 1000;
};

struct PrivacyPolicy {
  std::string dataIsolationLevel = "Standard";
  bool encryptPayload = false;
};

struct RequiredResources {
  int cpuCores = 0;
  uint64_t memoryBytes = 0;
  bool gpuRequired = false;
};

struct RequiredCapabilities {
  std::vector<std::string> models;
  std::vector<std::string> tools;
  std::vector<std::string> skills;
  std::vector<std::string> plugins;
};

struct ExecutionConstraints {
  double minTrustLevel = 0.0;
  std::string allowedRegions = "any";
};

struct CheckpointInfo {
  std::string checkpointId;
  std::string stateData;
  uint64_t timestampMs = 0;
};

struct DistributedTask {
  common::TaskID taskId;
  common::TaskID parentTaskId;
  std::string correlationId;
  std::string taskType;
  common::NodeID sourceNode;
  
  common::Priority priority = 0;
  uint64_t deadlineMs = 0; // Milliseconds since epoch
  uint64_t timeoutMs = 0;  // Milliseconds duration
  uint64_t scheduledTimeMs = 0; // Milliseconds since epoch for delayed execution
  
  RetryPolicy retryPolicy;
  PrivacyPolicy privacyPolicy;
  RequiredResources requiredResources;
  RequiredCapabilities requiredCapabilities;
  ExecutionConstraints executionConstraints;
  
  std::string payload;
  std::map<std::string, std::string> metadata;
  
  double progress = 0.0;
  std::string currentState = "PENDING"; // PENDING, SCHEDULED, RUNNING, COMPLETED, FAILED, RETRYING, CANCELLED
  common::NodeID assignedNode;
  
  CheckpointInfo checkpointInfo;

  std::string toJson() const;
  bool fromJson(const std::string& json);
};

} // namespace aegis::die::tasks
