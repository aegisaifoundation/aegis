import { randomUUID } from 'crypto';
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
export class RoundManager {
    rounds = new Map();
    roundNumber = 0;
    timeoutHandles = new Map();
    /** Called when a round expires without completing */
    onTimeout;
    /**
     * Creates a new learning round and registers it.
     * @param localNodeId The node ID of the initiating (lead) node
     * @param strategyName Which strategy will handle this round
     * @param timeoutMs How long before the round is automatically timed out
     * @param profileId Optional learning profile ID
     */
    createRound(localNodeId, strategyName, timeoutMs = 30_000, profileId) {
        this.roundNumber++;
        const roundId = `round-${randomUUID()}`;
        const now = Date.now();
        const round = {
            roundId,
            roundNumber: this.roundNumber,
            status: 'PENDING',
            participants: [localNodeId],
            leaderId: localNodeId,
            startedAt: new Date(now),
            deadline: now + timeoutMs,
            retryCount: 0,
            strategyName,
            profileId
        };
        this.rounds.set(roundId, round);
        this._startWatchdog(round, timeoutMs);
        console.log(`[RoundManager] Created round ${round.roundNumber} (${roundId}) — deadline in ${timeoutMs}ms.`);
        return round;
    }
    /** Transitions a round from PENDING to COLLECTING */
    startCollection(roundId) {
        this._transition(roundId, 'COLLECTING');
    }
    /** Transitions a round from COLLECTING to AGGREGATING */
    startAggregation(roundId) {
        this._transition(roundId, 'AGGREGATING');
    }
    /** Marks a round as COMPLETE and clears its watchdog */
    completeRound(roundId) {
        this._clearWatchdog(roundId);
        this._transition(roundId, 'COMPLETE');
        console.log(`[RoundManager] Round ${roundId} completed.`);
    }
    /** Marks a round as FAILED and clears its watchdog */
    failRound(roundId, reason) {
        this._clearWatchdog(roundId);
        this._transition(roundId, 'FAILED');
        console.warn(`[RoundManager] Round ${roundId} failed: ${reason}`);
    }
    /** Adds a participant to a PENDING or COLLECTING round */
    joinRound(roundId, nodeId) {
        const round = this.rounds.get(roundId);
        if (!round || (round.status !== 'PENDING' && round.status !== 'COLLECTING')) {
            console.warn(`[RoundManager] Cannot join round ${roundId} in state ${round?.status}`);
            return false;
        }
        if (!round.participants.includes(nodeId)) {
            round.participants.push(nodeId);
            console.log(`[RoundManager] Node ${nodeId} joined round ${roundId}. Participants: ${round.participants.length}`);
        }
        return true;
    }
    /** Removes a participant from a round gracefully */
    leaveRound(roundId, nodeId) {
        const round = this.rounds.get(roundId);
        if (!round)
            return;
        round.participants = round.participants.filter(p => p !== nodeId);
        console.log(`[RoundManager] Node ${nodeId} left round ${roundId}. Remaining: ${round.participants.length}`);
    }
    getRound(roundId) {
        return this.rounds.get(roundId);
    }
    getActiveRound() {
        return Array.from(this.rounds.values()).find(r => r.status === 'PENDING' || r.status === 'COLLECTING' || r.status === 'AGGREGATING');
    }
    getHistory() {
        return Array.from(this.rounds.values())
            .filter(r => r.status === 'COMPLETE' || r.status === 'FAILED' || r.status === 'TIMEOUT')
            .sort((a, b) => b.roundNumber - a.roundNumber);
    }
    getRoundCount() {
        return this.roundNumber;
    }
    shutdown() {
        for (const roundId of this.timeoutHandles.keys()) {
            this._clearWatchdog(roundId);
        }
        console.log('[RoundManager] Shutdown. All watchdogs cleared.');
    }
    // ── Private ───────────────────────────────────────────────────────────────
    _transition(roundId, status) {
        const round = this.rounds.get(roundId);
        if (!round) {
            console.warn(`[RoundManager] Unknown round: ${roundId}`);
            return;
        }
        const prev = round.status;
        round.status = status;
        console.log(`[RoundManager] Round ${round.roundNumber}: ${prev} → ${status}`);
    }
    _startWatchdog(round, timeoutMs) {
        const handle = setTimeout(() => {
            const current = this.rounds.get(round.roundId);
            if (current && current.status !== 'COMPLETE' && current.status !== 'FAILED') {
                this._transition(round.roundId, 'TIMEOUT');
                console.warn(`[RoundManager] Round ${round.roundNumber} timed out after ${timeoutMs}ms.`);
                this.onTimeout?.(current);
            }
        }, timeoutMs);
        this.timeoutHandles.set(round.roundId, handle);
    }
    _clearWatchdog(roundId) {
        const handle = this.timeoutHandles.get(roundId);
        if (handle) {
            clearTimeout(handle);
            this.timeoutHandles.delete(roundId);
        }
    }
}
//# sourceMappingURL=RoundManager.js.map