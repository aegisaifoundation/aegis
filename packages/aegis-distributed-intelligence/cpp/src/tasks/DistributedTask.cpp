#include "aegis/die/tasks/DistributedTask.hpp"
#include "aegis/die/common/JsonHelper.hpp"
#include <sstream>

namespace aegis::die::tasks {

std::string DistributedTask::toJson() const {
  std::stringstream ss;
  ss << "{"
     << "\"taskId\":\"" << taskId << "\","
     << "\"parentTaskId\":\"" << parentTaskId << "\","
     << "\"correlationId\":\"" << correlationId << "\","
     << "\"taskType\":\"" << taskType << "\","
     << "\"sourceNode\":\"" << sourceNode << "\","
     << "\"priority\":" << priority << ","
     << "\"deadlineMs\":" << deadlineMs << ","
     << "\"timeoutMs\":" << timeoutMs << ","
     << "\"scheduledTimeMs\":" << scheduledTimeMs << ","
     
     << "\"retryPolicy_maxRetries\":" << retryPolicy.maxRetries << ","
     << "\"retryPolicy_retryCount\":" << retryPolicy.retryCount << ","
     << "\"retryPolicy_backoffMs\":" << retryPolicy.backoffMs << ","
     
     << "\"privacyPolicy_dataIsolationLevel\":\"" << privacyPolicy.dataIsolationLevel << "\","
     << "\"privacyPolicy_encryptPayload\":" << (privacyPolicy.encryptPayload ? "true" : "false") << ","
     
     << "\"requiredResources_cpuCores\":" << requiredResources.cpuCores << ","
     << "\"requiredResources_memoryBytes\":" << requiredResources.memoryBytes << ","
     << "\"requiredResources_gpuRequired\":" << (requiredResources.gpuRequired ? "true" : "false") << ","
     
     << "\"requiredCapabilities_models\":" << common::serializeVector(requiredCapabilities.models) << ","
     << "\"requiredCapabilities_tools\":" << common::serializeVector(requiredCapabilities.tools) << ","
     << "\"requiredCapabilities_skills\":" << common::serializeVector(requiredCapabilities.skills) << ","
     << "\"requiredCapabilities_plugins\":" << common::serializeVector(requiredCapabilities.plugins) << ","
     
     << "\"executionConstraints_minTrustLevel\":" << executionConstraints.minTrustLevel << ","
     << "\"executionConstraints_allowedRegions\":\"" << executionConstraints.allowedRegions << "\","
     
     << "\"payload\":\"" << payload << "\","
     << "\"metadata\":" << common::serializeMap(metadata) << ","
     
     << "\"progress\":" << progress << ","
     << "\"currentState\":\"" << currentState << "\","
     << "\"assignedNode\":\"" << assignedNode << "\","
     
     << "\"checkpointInfo_checkpointId\":\"" << checkpointInfo.checkpointId << "\","
     << "\"checkpointInfo_stateData\":\"" << checkpointInfo.stateData << "\","
     << "\"checkpointInfo_timestampMs\":" << checkpointInfo.timestampMs
     << "}";
  return ss.str();
}

bool DistributedTask::fromJson(const std::string& json) {
  if (json.empty() || json.find("{") == std::string::npos) return false;
  taskId = common::parseString(json, "taskId");
  parentTaskId = common::parseString(json, "parentTaskId");
  correlationId = common::parseString(json, "correlationId");
  taskType = common::parseString(json, "taskType");
  sourceNode = common::parseString(json, "sourceNode");
  priority = common::parseInt(json, "priority");
  deadlineMs = common::parseUint64(json, "deadlineMs");
  timeoutMs = common::parseUint64(json, "timeoutMs");
  scheduledTimeMs = common::parseUint64(json, "scheduledTimeMs");
  
  retryPolicy.maxRetries = common::parseInt(json, "retryPolicy_maxRetries", 3);
  retryPolicy.retryCount = common::parseInt(json, "retryPolicy_retryCount", 0);
  retryPolicy.backoffMs = common::parseUint64(json, "retryPolicy_backoffMs", 1000);
  
  privacyPolicy.dataIsolationLevel = common::parseString(json, "privacyPolicy_dataIsolationLevel");
  privacyPolicy.encryptPayload = common::parseBool(json, "privacyPolicy_encryptPayload");
  
  requiredResources.cpuCores = common::parseInt(json, "requiredResources_cpuCores");
  requiredResources.memoryBytes = common::parseUint64(json, "requiredResources_memoryBytes");
  requiredResources.gpuRequired = common::parseBool(json, "requiredResources_gpuRequired");
  
  requiredCapabilities.models = common::parseVector(json, "requiredCapabilities_models");
  requiredCapabilities.tools = common::parseVector(json, "requiredCapabilities_tools");
  requiredCapabilities.skills = common::parseVector(json, "requiredCapabilities_skills");
  requiredCapabilities.plugins = common::parseVector(json, "requiredCapabilities_plugins");
  
  executionConstraints.minTrustLevel = common::parseDouble(json, "executionConstraints_minTrustLevel");
  executionConstraints.allowedRegions = common::parseString(json, "executionConstraints_allowedRegions");
  
  payload = common::parseString(json, "payload");
  metadata = common::parseMap(json, "metadata");
  
  progress = common::parseDouble(json, "progress");
  currentState = common::parseString(json, "currentState");
  assignedNode = common::parseString(json, "assignedNode");
  
  checkpointInfo.checkpointId = common::parseString(json, "checkpointInfo_checkpointId");
  checkpointInfo.stateData = common::parseString(json, "checkpointInfo_stateData");
  checkpointInfo.timestampMs = common::parseUint64(json, "checkpointInfo_timestampMs");
  return true;
}

} // namespace aegis::die::tasks
