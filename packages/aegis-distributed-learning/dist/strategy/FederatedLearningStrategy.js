/**
 * FederatedLearningStrategy
 *
 * Implements the classic coordinator-based federated learning loop:
 *   1. Coordinator selects participants based on capability advertisement
 *   2. Each participant trains locally and sends encrypted LoRA deltas
 *   3. Coordinator runs FedAvg aggregation
 *   4. Global model is broadcast to all participants
 *
 * Zero transport code. All P2P operations go through IStrategyContext.dis.
 */
export class FederatedLearningStrategy {
    name = 'federated';
    context;
    pendingWeights = new Map();
    collectionDeadline = 0;
    async initialize(context) {
        this.context = context;
        console.log('[FederatedStrategy] Initialized. Registering peer weight listener...');
        this._registerWeightListener();
    }
    async prepareRound(round) {
        console.log(`[FederatedStrategy] Preparing round ${round.roundNumber}...`);
        this.pendingWeights.clear();
        this.collectionDeadline = round.deadline;
        // Validate local LoRA adapter exists; create one if not
        const adapters = await this.context.loraManager.listAdapters();
        if (adapters.length === 0) {
            console.log('[FederatedStrategy] No LoRA adapter found. Creating baseline adapter...');
        }
    }
    async selectParticipants(candidates) {
        const dis = this.context.dis;
        if (!dis || candidates.length === 0)
            return [];
        const qualified = [];
        for (const nodeId of candidates) {
            try {
                const caps = await dis.capabilityService.getRemoteCapabilities(nodeId);
                if (caps.includes('federated_learning') || caps.includes('distributed_learning')) {
                    const trusted = await dis.trustService.verifyPeerTrust(nodeId);
                    if (trusted)
                        qualified.push(nodeId);
                }
            }
            catch {
                // Node unreachable — skip
            }
        }
        console.log(`[FederatedStrategy] Selected ${qualified.length}/${candidates.length} qualified participants.`);
        return qualified;
    }
    async exchangeUpdates(round) {
        const dis = this.context.dis;
        if (!dis) {
            console.log('[FederatedStrategy] Standalone mode — skipping P2P exchange.');
            return;
        }
        console.log(`[FederatedStrategy] Broadcasting round ${round.roundNumber} invitation to ${round.participants.length} peers...`);
        const localLoRA = this.context.loraManager.getLatestAdapterWeights();
        for (const peerId of round.participants) {
            if (peerId === this.context.localNodeId)
                continue;
            await dis.messagingService.sendMessage(peerId, 'federated_round_start', {
                roundId: round.roundId,
                roundNumber: round.roundNumber,
                leaderId: round.leaderId,
                deadline: round.deadline,
                globalWeights: localLoRA
            });
        }
        // Wait for participant responses (up to deadline or timeout)
        await this._waitForWeights(round.participants.length - 1, round.deadline);
    }
    async aggregate(round) {
        console.log(`[FederatedStrategy] Aggregating ${this.pendingWeights.size} weight updates...`);
        const weightSets = Array.from(this.pendingWeights.values());
        // Include our own local weights
        const localWeights = this.context.loraManager.getLatestAdapterWeights();
        weightSets.push(localWeights);
        const result = await this.context.aggregationManager.aggregateWeights(round.roundId, round.roundNumber, weightSets, Array.from(this.pendingWeights.keys()));
        return result;
    }
    async validate(result) {
        if (!result.resultHash || result.contributors.length === 0) {
            console.warn('[FederatedStrategy] Validation failed: empty result or no contributors.');
            return false;
        }
        // Verify all contributors were trusted at time of collection
        const dis = this.context.dis;
        if (dis) {
            for (const nodeId of result.contributors) {
                const trusted = await dis.trustService.verifyPeerTrust(nodeId);
                if (!trusted) {
                    console.warn(`[FederatedStrategy] Untrusted contributor detected: ${nodeId}. Rejecting result.`);
                    await this.context.aggregationManager.rejectInvalidUpdate(nodeId, 'trust_verification_failed');
                    return false;
                }
            }
        }
        console.log('[FederatedStrategy] Validation passed.');
        return true;
    }
    async publishModel(result) {
        const dis = this.context.dis;
        if (!dis) {
            console.log('[FederatedStrategy] Standalone mode — skipping model broadcast.');
            return;
        }
        console.log(`[FederatedStrategy] Broadcasting aggregated model to network (round ${result.roundNumber})...`);
        await dis.eventService.publishEvent('federated_model_published', {
            roundId: result.roundId,
            roundNumber: result.roundNumber,
            resultHash: result.resultHash,
            algorithm: result.algorithm,
            contributorCount: result.contributors.length
        });
    }
    async finishRound(round) {
        // Checkpoint the completed round
        await this.context.checkpointManager.saveRoundCheckpoint(round);
        // Version the new aggregated model
        await this.context.versionManager.createVersion(round.roundId, 'aggregation', null, `round-${round.roundNumber}`);
        this.pendingWeights.clear();
        console.log(`[FederatedStrategy] Round ${round.roundNumber} finalised and checkpointed.`);
    }
    async shutdown() {
        this.pendingWeights.clear();
        console.log('[FederatedStrategy] Shutdown complete.');
    }
    // ── Private helpers ──────────────────────────────────────────────────────
    _registerWeightListener() {
        const dis = this.context.dis;
        if (!dis)
            return;
        dis.messagingService.onMessage('federated_round_weights', (payload, senderId) => {
            console.log(`[FederatedStrategy] Received weight update from ${senderId} for round ${payload.roundId}`);
            this.pendingWeights.set(senderId, payload.localWeights);
        });
    }
    async _waitForWeights(expected, deadline) {
        const timeoutMs = Math.max(0, deadline - Date.now());
        const pollIntervalMs = 100;
        let elapsed = 0;
        while (this.pendingWeights.size < expected && elapsed < timeoutMs) {
            await new Promise(r => setTimeout(r, pollIntervalMs));
            elapsed += pollIntervalMs;
        }
        console.log(`[FederatedStrategy] Collected ${this.pendingWeights.size}/${expected} weight updates.`);
    }
}
//# sourceMappingURL=FederatedLearningStrategy.js.map