import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { memoryManager } from '../../../aegis-core/src/memory/MemoryManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  
  let sessionId: string | null = null;
  let fileType: string | null = null;

  const activeSessionId = await runtimeSessionManager.getActiveSession();

  if (parts.length === 0) {
    if (!activeSessionId) {
      return {
        success: false,
        message: 'No active session is mounted. Usage: /create-snapshot <session-id> [history | sessionMemory | workingMemory]'
      };
    }
    sessionId = activeSessionId;
  } else if (parts.length === 1) {
    const arg = parts[0];
    if (['history', 'sessionMemory', 'workingMemory'].includes(arg)) {
      if (!activeSessionId) {
        return {
          success: false,
          message: 'No active session is mounted to target. Usage: /create-snapshot <session-id> <type>'
        };
      }
      sessionId = activeSessionId;
      fileType = arg;
    } else {
      sessionId = arg;
    }
  } else {
    sessionId = parts[0];
    fileType = parts[1];
  }

  if (fileType && !['history', 'sessionMemory', 'workingMemory'].includes(fileType)) {
    return {
      success: false,
      message: `Invalid file type: ${fileType}. Allowed types: history, sessionMemory, workingMemory`
    };
  }

  try {
    const typesToSnapshot: Array<'history' | 'sessionMemory' | 'workingMemory'> = fileType
      ? [fileType as any]
      : ['history', 'sessionMemory', 'workingMemory'];

    const createdFiles: string[] = [];
    for (const type of typesToSnapshot) {
      const result = await memoryManager.createSnapshot(sessionId, type, 'user');
      if (result) {
        createdFiles.push(result);
      }
    }

    if (createdFiles.length === 0) {
      return {
        success: false,
        message: `Failed to create snapshot: source files did not exist for session ${sessionId}.`
      };
    }

    return {
      success: true,
      message: `Successfully created snapshot(s) for session ${sessionId}: ${createdFiles.join(', ')}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to create snapshot: ${err.message}`
    };
  }
}
