import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const sessionId = input.trim();
  if (!sessionId) {
    return {
      success: false,
      message: 'Usage: /checkout <session-id>'
    };
  }

  try {
    await runtimeSessionManager.checkoutSession(sessionId, 'user');
    return {
      success: true,
      message: `Successfully checked out session: ${sessionId}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to checkout session ${sessionId}: ${err.message}`
    };
  }
}
