import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const sessionId = input.trim();
  if (!sessionId) {
    return {
      success: false,
      message: 'Usage: /delete-session <session-id>'
    };
  }

  try {
    await runtimeSessionManager.deleteSession(sessionId, 'user');
    return {
      success: true,
      message: `Successfully soft-deleted session: ${sessionId} (moved to trash).`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to delete session ${sessionId}: ${err.message}`
    };
  }
}
