import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const meta = await runtimeSessionManager.createNewSession([], 'user');
    return {
      success: true,
      message: `Successfully created and mounted new session: ${meta.sessionId}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to create new session: ${err.message}`
    };
  }
}
