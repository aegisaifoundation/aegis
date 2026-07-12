#pragma once
#include <string>
#include <vector>
#include <map>

namespace aegis::die::topology {

enum class TopologyType {
  Standalone,
  Peer,
  Mesh,
  Cluster,
  Hierarchical,
  Federation
};

struct NetworkTopology {
  TopologyType type = TopologyType::Mesh;
  std::map<std::string, std::vector<std::string>> adjacencyList;
};

} // namespace aegis::die::topology
