export class RestartManager {
    static MAX_RESTARTS = 3;
    static INITIAL_DELAY_MS = 2000;
    static BACKOFF_FACTOR = 1.5;
    restartCount = 0;
    lastRestartAt = null;
    restartHistory = [];
    constructor() { }
    canRestart() {
        return this.restartCount < RestartManager.MAX_RESTARTS;
    }
    getRestartCount() {
        return this.restartCount;
    }
    getLastRestartAt() {
        return this.lastRestartAt;
    }
    getRestartHistory() {
        return this.restartHistory;
    }
    recordRestart() {
        this.restartCount++;
        const now = new Date();
        this.lastRestartAt = now;
        this.restartHistory.push(now);
        return this.getDelay();
    }
    reset() {
        this.restartCount = 0;
        this.lastRestartAt = null;
        this.restartHistory = [];
    }
    getDelay() {
        if (this.restartCount <= 1)
            return RestartManager.INITIAL_DELAY_MS;
        return Math.round(RestartManager.INITIAL_DELAY_MS * Math.pow(RestartManager.BACKOFF_FACTOR, this.restartCount - 1));
    }
}
export default RestartManager;
//# sourceMappingURL=RestartManager.js.map