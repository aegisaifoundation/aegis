import fs from 'fs';
import path from 'path';
import type { LearningRound, LoRAAdapter } from '../types/index.js';

/**
 * LearningCheckpointManager
 *
 * Serialises and restores learning state to disk, enabling crash recovery,
 * round resumption, and rollback to earlier verified states.
 *
 * Checkpoint directory: <workspace>/learning/checkpoints/
 */
export class LearningCheckpointManager {
  private checkpointDir: string;

  constructor(workspacePath: string) {
    this.checkpointDir = path.join(workspacePath, 'learning', 'checkpoints');
    this._ensureDir(this.checkpointDir);
  }

  // ── Round Checkpoints ─────────────────────────────────────────────────────

  /** Serialise the full round state to disk */
  async saveRoundCheckpoint(round: LearningRound): Promise<void> {
    const file = path.join(this.checkpointDir, 'rounds', `${round.roundId}.json`);
    this._ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify({ ...round, _checkpointedAt: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`[CheckpointManager] Saved round checkpoint: ${round.roundId}`);
  }

  /** Restore the most recent checkpoint for a given round */
  restoreRoundCheckpoint(roundId: string): LearningRound | null {
    const file = path.join(this.checkpointDir, 'rounds', `${roundId}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      raw.startedAt = new Date(raw.startedAt);
      return raw as LearningRound;
    } catch {
      return null;
    }
  }

  // ── Training Checkpoints ──────────────────────────────────────────────────

  /** Save per-epoch training state (weights snapshot) */
  async saveTrainingCheckpoint(epoch: number, weights: Record<string, number[]>): Promise<string> {
    const id = `epoch-${epoch}-${Date.now()}`;
    const file = path.join(this.checkpointDir, 'training', `${id}.json`);
    this._ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify({ epoch, weights, savedAt: new Date().toISOString() }, null, 2), 'utf8');
    console.log(`[CheckpointManager] Saved training checkpoint: ${id}`);
    return id;
  }

  /** Restore a training checkpoint by ID */
  restoreTrainingCheckpoint(checkpointId: string): { epoch: number; weights: Record<string, number[]> } | null {
    const file = path.join(this.checkpointDir, 'training', `${checkpointId}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  // ── LoRA Checkpoints ──────────────────────────────────────────────────────

  /** Snapshot a LoRA adapter state (metadata only — never the base model) */
  async saveLoRACheckpoint(adapter: LoRAAdapter): Promise<void> {
    const file = path.join(this.checkpointDir, 'lora', `${adapter.id}-${adapter.version}.json`);
    this._ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(adapter, null, 2), 'utf8');
    console.log(`[CheckpointManager] Saved LoRA checkpoint: ${adapter.id}@${adapter.version}`);
  }

  /** Restore the latest LoRA checkpoint for a given adapter ID */
  restoreLoRACheckpoint(adapterId: string): LoRAAdapter | null {
    const dir = path.join(this.checkpointDir, 'lora');
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith(adapterId))
      .sort()
      .reverse();

    if (files.length === 0) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, files[0]!), 'utf8'));
      raw.createdAt = new Date(raw.createdAt);
      return raw as LoRAAdapter;
    } catch {
      return null;
    }
  }

  // ── Rollback ──────────────────────────────────────────────────────────────

  /** Rollback a round to a specific prior checkpoint version */
  rollbackRound(roundId: string, _version?: string): LearningRound | null {
    // For current implementation, returns the persisted checkpoint (single version per round)
    // Future: support versioned snapshots per round
    return this.restoreRoundCheckpoint(roundId);
  }

  // ── Housekeeping ──────────────────────────────────────────────────────────

  /** Delete training checkpoints older than maxAgeMs */
  pruneOldCheckpoints(maxAgeMs: number): number {
    const dir = path.join(this.checkpointDir, 'training');
    if (!fs.existsSync(dir)) return 0;

    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;

    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        pruned++;
      }
    }

    console.log(`[CheckpointManager] Pruned ${pruned} old training checkpoints.`);
    return pruned;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
