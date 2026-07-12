import { ChildProcess } from 'child_process';

export class ShutdownManager {
  private static SHUTDOWN_TIMEOUT_MS = 5000;

  static async terminate(cp: ChildProcess | null): Promise<void> {
    if (!cp || cp.killed) return;

    return new Promise((resolve) => {
      const pid = cp.pid;
      let forceKillTimer: NodeJS.Timeout | null = null;

      const onExit = () => {
        if (forceKillTimer) clearTimeout(forceKillTimer);
        resolve();
      };

      cp.once('exit', onExit);

      // 1. Attempt graceful shutdown via stdin write
      try {
        cp.stdin?.write('SHUTDOWN\n');
        cp.stdin?.end();
      } catch (err) {
        // stdin write fail
      }

      // Also send SIGTERM signal on POSIX platforms
      if (process.platform !== 'win32') {
        try {
          cp.kill('SIGTERM');
        } catch (e) {}
      }

      // 2. Set force kill timeout as backup
      forceKillTimer = setTimeout(() => {
        if (!cp.killed) {
          console.warn(`[ShutdownManager] Process PID ${pid} did not exit gracefully in time. Force killing...`);
          try {
            cp.kill('SIGKILL');
          } catch (e) {}
        }
        cp.off('exit', onExit);
        resolve();
      }, this.SHUTDOWN_TIMEOUT_MS);
    });
  }
}
export default ShutdownManager;
