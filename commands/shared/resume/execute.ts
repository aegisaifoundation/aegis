import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const sessionId = input.trim();
  if (!sessionId) {
    return {
      success: false,
      message: 'Usage: /resume <session-id>'
    };
  }

  try {
    await runtimeSessionManager.resumeSession(sessionId, 'user');
    return {
      success: true,
      message: `Successfully resumed and mounted session: ${sessionId}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to resume session ${sessionId}: ${err.message}`
    };
  }
}
