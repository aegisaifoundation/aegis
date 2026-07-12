#pragma once
#include "../common/Types.hpp"
#include "../topology/NetworkTopology.hpp"
#include "../policy/NodePolicy.hpp"
#include <vector>
#include <string>
#include <map>
#include <memory>

namespace aegis::die::node {
class NodeDescriptor;
}

namespace aegis::die::cluster {

struct Cluster {
  common::ClusterID clusterId;
  std::string name;
  
  std::vector<std::shared_ptr<node::NodeDescriptor>> nodes;
  topology::NetworkTopology topology;
  
  common::NodeID coordinatorId;
  policy::NodePolicy clusterPolicy;
  
  std::map<std::string, std::string> metadata;
};

} // namespace aegis::die::cluster
