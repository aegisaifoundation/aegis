#pragma once
#include <string>
#include <vector>
#include "../common/Types.hpp"

namespace aegis::die::capabilities {

struct NodeCapabilities {
  // Original hardware capabilities
  int cpuCores = 0;
  int cpuThreads = 0;
  std::string cpuModel;
  
  bool gpuAvailable = false;
  std::string gpuModel;
  
  bool npuAvailable = false;
  bool tpuAvailable = false;
  
  common::ByteSize ramCapacity = 0;
  common::ByteSize storageCapacity = 0;
  
  std::string osName;
  std::string architecture;
  
  std::vector<std::string> instructionSets;
  bool cudaSupported = false;
  bool openclSupported = false;
  
  std::vector<std::string> installedEngines;
  std::vector<std::string> installedPackages;
  std::vector<std::string> installedModels;
  
  std::vector<std::string> networkInterfaces;

  // Phase 1 Distributed execution capability registry requirements
  common::NodeID nodeId;
  double cpuUtilization = 0.0;
  double ramUtilization = 0.0;
  double networkLatency = 0.0;
  std::vector<std::string> availableAgents;
  std::vector<std::string> installedTools;
  std::vector<std::string> installedSkills;
  std::vector<std::string> installedPlugins;
  std::vector<std::string> activeServices;
  std::string runtimeVersion = "1.0.0";
  std::string platformInfo;
  double trustLevel = 1.0;
  double currentWorkload = 0.0;

  // JSON Serialization
  std::string toJson() const;
  bool fromJson(const std::string& json);
};

} // namespace aegis::die::capabilities

