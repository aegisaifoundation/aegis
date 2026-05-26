import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  // Quote-aware parser
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) {
    args.push(current);
  }

  if (args.length < 3) {
    return {
      success: false,
      message: 'Usage: /rename-session <session-id> "<display-name>" "<description>"'
    };
  }

  const sessionId = args[0];
  const displayName = args[1];
  const description = args[2];

  try {
    await runtimeSessionManager.renameSession(sessionId, displayName, description, 'user');
    return {
      success: true,
      message: `Successfully renamed session ${sessionId} to: "${displayName}"`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to rename session ${sessionId}: ${err.message}`
    };
  }
}
