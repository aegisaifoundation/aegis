#pragma once

namespace aegis::die::roles {

enum class NodeRole {
  Coordinator,
  Aggregator,
  Trainer,
  InferenceWorker,
  Storage,
  Relay,
  Observer,
  Gateway,
  Validator,
  Scheduler,
  Recovery,
  Discovery
};

} // namespace aegis::die::roles
