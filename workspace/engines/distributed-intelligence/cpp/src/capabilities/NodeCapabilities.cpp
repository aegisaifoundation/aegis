#include "aegis/die/capabilities/NodeCapabilities.hpp"
#include "aegis/die/common/JsonHelper.hpp"
#include <sstream>

namespace aegis::die::capabilities {

std::string NodeCapabilities::toJson() const {
  std::stringstream ss;
  ss << "{"
     << "\"cpuCores\":" << cpuCores << ","
     << "\"cpuThreads\":" << cpuThreads << ","
     << "\"cpuModel\":\"" << cpuModel << "\","
     << "\"gpuAvailable\":" << (gpuAvailable ? "true" : "false") << ","
     << "\"gpuModel\":\"" << gpuModel << "\","
     << "\"npuAvailable\":" << (npuAvailable ? "true" : "false") << ","
     << "\"tpuAvailable\":" << (tpuAvailable ? "true" : "false") << ","
     << "\"ramCapacity\":" << ramCapacity << ","
     << "\"storageCapacity\":" << storageCapacity << ","
     << "\"osName\":\"" << osName << "\","
     << "\"architecture\":\"" << architecture << "\","
     << "\"instructionSets\":" << common::serializeVector(instructionSets) << ","
     << "\"cudaSupported\":" << (cudaSupported ? "true" : "false") << ","
     << "\"openclSupported\":" << (openclSupported ? "true" : "false") << ","
     << "\"installedEngines\":" << common::serializeVector(installedEngines) << ","
     << "\"installedPackages\":" << common::serializeVector(installedPackages) << ","
     << "\"installedModels\":" << common::serializeVector(installedModels) << ","
     << "\"networkInterfaces\":" << common::serializeVector(networkInterfaces) << ","
     << "\"nodeId\":\"" << nodeId << "\","
     << "\"cpuUtilization\":" << cpuUtilization << ","
     << "\"ramUtilization\":" << ramUtilization << ","
     << "\"networkLatency\":" << networkLatency << ","
     << "\"availableAgents\":" << common::serializeVector(availableAgents) << ","
     << "\"installedTools\":" << common::serializeVector(installedTools) << ","
     << "\"installedSkills\":" << common::serializeVector(installedSkills) << ","
     << "\"installedPlugins\":" << common::serializeVector(installedPlugins) << ","
     << "\"activeServices\":" << common::serializeVector(activeServices) << ","
     << "\"runtimeVersion\":\"" << runtimeVersion << "\","
     << "\"platformInfo\":\"" << platformInfo << "\","
     << "\"trustLevel\":" << trustLevel << ","
     << "\"currentWorkload\":" << currentWorkload
     << "}";
  return ss.str();
}

bool NodeCapabilities::fromJson(const std::string& json) {
  if (json.empty() || json.find("{") == std::string::npos) return false;
  cpuCores = common::parseInt(json, "cpuCores");
  cpuThreads = common::parseInt(json, "cpuThreads");
  cpuModel = common::parseString(json, "cpuModel");
  gpuAvailable = common::parseBool(json, "gpuAvailable");
  gpuModel = common::parseString(json, "gpuModel");
  npuAvailable = common::parseBool(json, "npuAvailable");
  tpuAvailable = common::parseBool(json, "tpuAvailable");
  ramCapacity = common::parseUint64(json, "ramCapacity");
  storageCapacity = common::parseUint64(json, "storageCapacity");
  osName = common::parseString(json, "osName");
  architecture = common::parseString(json, "architecture");
  instructionSets = common::parseVector(json, "instructionSets");
  cudaSupported = common::parseBool(json, "cudaSupported");
  openclSupported = common::parseBool(json, "openclSupported");
  installedEngines = common::parseVector(json, "installedEngines");
  installedPackages = common::parseVector(json, "installedPackages");
  installedModels = common::parseVector(json, "installedModels");
  networkInterfaces = common::parseVector(json, "networkInterfaces");
  
  nodeId = common::parseString(json, "nodeId");
  cpuUtilization = common::parseDouble(json, "cpuUtilization");
  ramUtilization = common::parseDouble(json, "ramUtilization");
  networkLatency = common::parseDouble(json, "networkLatency");
  availableAgents = common::parseVector(json, "availableAgents");
  installedTools = common::parseVector(json, "installedTools");
  installedSkills = common::parseVector(json, "installedSkills");
  installedPlugins = common::parseVector(json, "installedPlugins");
  activeServices = common::parseVector(json, "activeServices");
  runtimeVersion = common::parseString(json, "runtimeVersion");
  platformInfo = common::parseString(json, "platformInfo");
  trustLevel = common::parseDouble(json, "trustLevel", 1.0);
  currentWorkload = common::parseDouble(json, "currentWorkload");
  return true;
}

} // namespace aegis::die::capabilities
