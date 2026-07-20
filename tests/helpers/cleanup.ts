import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { workspaceManager } from '../../packages/aegis-runtime/src/workspace/WorkspaceManager.js';
import { runtimeStateManager } from '../../packages/aegis-runtime/src/services/RuntimeStateManager.js';

export async function cleanupTestEnvironment() {
  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  
  // 1. Reset active session in runtime-state.json to default
  try {
    const state = await runtimeStateManager.loadState();
    state.activeSessionId = 'default';
    state.mountedSessionId = 'default';
    state.lastShutdownClean = true;
    state.recoveryRequired = false;
    state.recoveryReason = '';
    state.recoveryAttempts = 0;
    delete state.mountLease;
    await runtimeStateManager.saveState(state);
  } catch (err) {}

  // 2. Clean checkpoints directory
  const checkpointsDir = path.resolve(wsRoot, 'runtime/checkpoints');
  if (existsSync(checkpointsDir)) {
    try {
      const files = await fs.readdir(checkpointsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.rm(path.join(checkpointsDir, file), { force: true });
        }
      }
    } catch (err) {}
  }

  // 3. Clean temporary files / leftover .tmp files
  const runtimeDir = path.resolve(wsRoot, 'runtime');
  if (existsSync(runtimeDir)) {
    try {
      const files = await fs.readdir(runtimeDir);
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          await fs.rm(path.join(runtimeDir, file), { force: true });
        }
      }
    } catch (err) {}
  }

  // 4. Clean test session directories
  const sessionsDir = path.resolve(wsRoot, 'memory/sessions');
  if (existsSync(sessionsDir)) {
    try {
      const dirs = await fs.readdir(sessionsDir);
      for (const dirName of dirs) {
        if (
          dirName.startsWith('test-') ||
          dirName.startsWith('stress-') ||
          dirName.startsWith('recovery-') ||
          dirName.startsWith('session-integration-')
        ) {
          const dirPath = path.join(sessionsDir, dirName);
          await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
        }
      }
    } catch (err) {}
  }
}
