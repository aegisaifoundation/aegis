#pragma once
#include "../version/Version.hpp"

namespace aegis::die::kernel {

struct KernelVersion {
  version::SemanticVersion apiVersion{1, 0, 0};
  version::SemanticVersion implVersion{1, 0, 0};
};

} // namespace aegis::die::kernel
