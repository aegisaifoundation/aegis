import { ConsensusVote } from '../types/index.js';

export type ConsensusMechanism = 'majority' | 'weighted_trust' | 'weighted_reputation' | 'contribution';

export class ConsensusManager {

  /**
   * Determine consensus outcome for a set of votes.
   */
  evaluateConsensus(
    votes: ConsensusVote[],
    mechanism: ConsensusMechanism,
    nodeWeights?: Record<string, number>
  ): { approved: boolean; consensusScore: number } {
    if (votes.length === 0) {
      return { approved: false, consensusScore: 0 };
    }

    let yesScore = 0;
    let totalScore = 0;

    switch (mechanism) {
      case 'weighted_trust':
      case 'weighted_reputation':
      case 'contribution': {
        const weights = nodeWeights ?? {};
        for (const vote of votes) {
          const w = weights[vote.nodeId] ?? 1.0;
          const score = vote.confidence * w;
          totalScore += score;
          if (vote.approve) {
            yesScore += score;
          }
        }
        break;
      }
      case 'majority':
      default: {
        for (const vote of votes) {
          totalScore += 1.0;
          if (vote.approve) {
            yesScore += 1.0;
          }
        }
        break;
      }
    }

    const consensusScore = totalScore > 0 ? yesScore / totalScore : 0;
    const approved = consensusScore > 0.5;

    console.log(`[ConsensusManager] Tally using [${mechanism}] model: ${approved ? 'APPROVED' : 'REJECTED'} (score: ${consensusScore.toFixed(4)})`);
    return { approved, consensusScore };
  }
}
