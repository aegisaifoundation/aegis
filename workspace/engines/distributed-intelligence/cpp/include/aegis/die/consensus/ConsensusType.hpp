#pragma once

namespace aegis::die::consensus {

enum class ConsensusType {
  Raft,
  Paxos,
  PBFT,
  ProofOfTrust,
  Custom
};

} // namespace aegis::die::consensus
