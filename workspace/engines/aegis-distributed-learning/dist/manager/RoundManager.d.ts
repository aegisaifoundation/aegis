import type { LearningRound } from '../types/index.js';
/**
 * RoundManager
 *
 * Owns the lifecycle of individual learning rounds.
 * Manages creation, participant tracking, leader assignment,
 * timeout watchdog, and state machine transitions.
 *
 * Round state machine:
 *   PENDING → COLLECTING → AGGREGATING → COMPLETE
 *                                      ↘ FAILED
 *                                      ↘ TIMEOUT
 */
export declare class RoundManager {
    private rounds;
    private roundNumber;
    private timeoutHandles;
    /** Called when a round expires without completing */
    onTimeout?: (round: LearningRound) => void;
    /**
     * Creates a new learning round and registers it.
     * @param localNodeId The node ID of the initiating (lead) node
     * @param strategyName Which strategy will handle this round
     * @param timeoutMs How long before the round is automatically timed out
     * @param profileId Optional learning profile ID
     */
    createRound(localNodeId: string, strategyName: string, timeoutMs?: number, profileId?: string): LearningRound;
    /** Transitions a round from PENDING to COLLECTING */
    startCollection(roundId: string): void;
    /** Transitions a round from COLLECTING to AGGREGATING */
    startAggregation(roundId: string): void;
    /** Marks a round as COMPLETE and clears its watchdog */
    completeRound(roundId: string): void;
    /** Marks a round as FAILED and clears its watchdog */
    failRound(roundId: string, reason: string): void;
    /** Adds a participant to a PENDING or COLLECTING round */
    joinRound(roundId: string, nodeId: string): boolean;
    /** Removes a participant from a round gracefully */
    leaveRound(roundId: string, nodeId: string): void;
    getRound(roundId: string): LearningRound | undefined;
    getActiveRound(): LearningRound | undefined;
    getHistory(): LearningRound[];
    getRoundCount(): number;
    shutdown(): void;
    private _transition;
    private _startWatchdog;
    private _clearWatchdog;
}
//# sourceMappingURL=RoundManager.d.ts.map