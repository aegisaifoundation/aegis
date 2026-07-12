#pragma once
#include "../identity/NodeIdentity.hpp"
#include "../capabilities/NodeCapabilities.hpp"
#include "../resources/NodeResources.hpp"
#include "../roles/NodeRole.hpp"
#include "../policy/NodePolicy.hpp"
#include "../configuration/NodeConfiguration.hpp"
#include "../metadata/Metadata.hpp"
#include "../statistics/NodeStatistics.hpp"
#include "../health/NodeHealth.hpp"
#include "../membership/ClusterMembership.hpp"
#include <vector>

namespace aegis::die::node {

struct NodeDescriptor {
  identity::NodeIdentity identity;
  capabilities::NodeCapabilities capabilities;
  resources::NodeResources resources;
  std::vector<roles::NodeRole> roles;
  policy::NodePolicy policy;
  configuration::NodeConfiguration configuration;
  metadata::Metadata metadata;
  statistics::NodeStatistics statistics;
  health::NodeHealth health;
  membership::ClusterMembership membership;
};

} // namespace aegis::die::node
