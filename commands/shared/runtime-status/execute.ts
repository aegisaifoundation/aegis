import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeStateManager } from '../../../aegis-core/src/runtime/RuntimeStateManager.js';
import { runtimeHealthValidator } from '../../../aegis-core/src/runtime/RuntimeHealthValidator.js';
import { sessionStateManager } from '../../../aegis-core/src/runtime/SessionStateManager.js';
import { memoryGateway } from '../../../aegis-core/src/memory/MemoryGateway.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const runtimeState = await runtimeStateManager.loadState();
    const health = await runtimeHealthValidator.validateHealth();

    const activeSessionId = runtimeState.activeSessionId || 'None';
    let checkpointVersion = 0;
    let workingWordCount = 0;
    let sessionWordCount = 0;
    let objective = 'None';
    let taskCount = 0;

    if (runtimeState.activeSessionId) {
      try {
        const sessionState = await sessionStateManager.loadSessionState(runtimeState.activeSessionId);
        checkpointVersion = sessionState.checkpointVersion || 0;
        objective = sessionState.currentObjective || 'None';
        taskCount = sessionState.activeTasks?.length || 0;

        const workingMemory = await memoryGateway.getWorkingMemory(runtimeState.activeSessionId);
        workingWordCount = workingMemory.trim().split(/\s+/).filter(Boolean).length;

        const sessionMemory = await memoryGateway.getSessionMemory(runtimeState.activeSessionId);
        sessionWordCount = sessionMemory.trim().split(/\s+/).filter(Boolean).length;
      } catch (err) {
        // Active session files might not exist yet
      }
    }

    const message = [
      `=== AEGIS Core Runtime Status ===`,
      `Active Session     : ${activeSessionId}`,
      `Runtime Health     : ${health.healthy ? 'HEALTHY' : 'DEGRADED'}`,
      `Health Status      : ${health.status}`,
      `Checkpoint Version : ${checkpointVersion}`,
      `Lock State         : ${runtimeState.runtimeLockState || 'IDLE'}`,
      `Boot Mode          : ${runtimeState.bootMode || 'NORMAL'}`,
      `Recovery Required  : ${runtimeState.recoveryRequired ? 'YES' : 'NO'}`,
      `Mount Generation   : ${runtimeState.mountGeneration || 0}`,
      ``,
      `=== Current Session Projections ===`,
      `Current Objective  : ${objective}`,
      `Active Tasks       : ${taskCount}`,
      `Working Memory Size: ${workingWordCount} words (Budget: 1000)`,
      `Session Memory Size: ${sessionWordCount} words (Budget: 1500)`,
      ``,
      `=== Health Validator Log ===`,
      health.errors.length > 0
        ? health.errors.map(err => `[ERROR] ${err}`).join('\n')
        : `[OK] All core constraints and state projections are synchronized.`
    ].join('\n');

    return {
      success: true,
      message
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to inspect runtime status: ${err.message}`
    };
  }
}
