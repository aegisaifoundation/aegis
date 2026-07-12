#pragma once
#include "Labels.hpp"
#include "Tags.hpp"
#include "Annotation.hpp"

namespace aegis::die::metadata {

struct Metadata {
  Labels labels;
  Tags tags;
  Annotation annotations;
};

} // namespace aegis::die::metadata
