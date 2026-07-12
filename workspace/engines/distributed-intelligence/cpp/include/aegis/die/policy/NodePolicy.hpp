#pragma once

namespace aegis::die::policy {

struct NodePolicy {
  bool allowDiscovery = true;
  bool allowTraining = true;
  bool allowAggregation = true;
  bool allowInference = true;
  bool allowStorage = true;
  bool allowRelay = true;
  bool allowScheduling = true;
  
  bool allowPackageInstallation = false;
  bool allowDatasetUpload = false;
  bool allowDatasetDownload = false;
  bool allowModelDownload = false;
};

} // namespace aegis::die::policy
