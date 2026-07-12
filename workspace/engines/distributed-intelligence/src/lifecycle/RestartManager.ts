export class RestartManager {
  private static MAX_RESTARTS = 3;
  private static INITIAL_DELAY_MS = 2000;
  private static BACKOFF_FACTOR = 1.5;

  private restartCount = 0;
  private lastRestartAt: Date | null = null;
  private restartHistory: Date[] = [];

  constructor() {}

  canRestart(): boolean {
    return this.restartCount < RestartManager.MAX_RESTARTS;
  }

  getRestartCount(): number {
    return this.restartCount;
  }

  getLastRestartAt(): Date | null {
    return this.lastRestartAt;
  }

  getRestartHistory(): Date[] {
    return this.restartHistory;
  }

  recordRestart(): number {
    this.restartCount++;
    const now = new Date();
    this.lastRestartAt = now;
    this.restartHistory.push(now);
    return this.getDelay();
  }

  reset(): void {
    this.restartCount = 0;
    this.lastRestartAt = null;
    this.restartHistory = [];
  }

  getDelay(): number {
    if (this.restartCount <= 1) return RestartManager.INITIAL_DELAY_MS;
    return Math.round(
      RestartManager.INITIAL_DELAY_MS * Math.pow(RestartManager.BACKOFF_FACTOR, this.restartCount - 1)
    );
  }
}
export default RestartManager;
