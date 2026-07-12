#pragma once
#include <string>
#include <vector>
#include "../common/Types.hpp"

namespace aegis::die::capabilities {

struct NodeCapabilities {
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
};

} // namespace aegis::die::capabilities
