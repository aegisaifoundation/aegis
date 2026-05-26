import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { workspaceManager } from '../../../aegis-core/src/runtime/WorkspaceManager.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import readline from 'readline';

async function ask(query: string): Promise<string> {
  const eventNames = ['data', 'keypress', 'readable', 'line'];
  const savedListeners: Record<string, any[]> = {};

  for (const event of eventNames) {
    savedListeners[event] = [...process.stdin.listeners(event)];
    process.stdin.removeAllListeners(event);
  }

  const wasRaw = process.stdin.isRaw;
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Ensure process.stdin is resumed and active for reading input
  process.stdin.resume();

  try {
    return await new Promise<string>((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer.trim());
      });
    });
  } finally {
    rl.close();

    // Resume process.stdin since rl.close() automatically pauses it
    process.stdin.resume();
    
    // Restore raw mode
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(wasRaw);
    }

    // Restore listeners
    for (const event of eventNames) {
      process.stdin.removeAllListeners(event);
      for (const listener of savedListeners[event]) {
        process.stdin.on(event, listener);
      }
    }
  }
}

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const sessionId = input.trim();
  if (!sessionId) {
    return {
      success: false,
      message: 'Usage: /purge-session <session-id>'
    };
  }

  const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
  const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);

  if (!existsSync(trashDir)) {
    return {
      success: false,
      message: `Session ${sessionId} is not in the trash.`
    };
  }

  try {
    const confirmation = await ask(`Are you sure you want to permanently delete session ${sessionId} from trash? (yes/no): `);
    
    if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
      return {
        success: true,
        message: 'Purge process aborted.'
      };
    }

    const finalConfirm = await ask('To confirm, please type "delete": ');
    
    if (finalConfirm !== 'delete') {
      return {
        success: false,
        message: 'Spelling is incorrect. Purge process aborted.'
      };
    }

    // Permanently delete folder
    await fs.rm(trashDir, { recursive: true, force: true });

    return {
      success: true,
      message: `Session ${sessionId} has been permanently deleted from trash.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to permanently delete session ${sessionId}: ${err.message}`
    };
  }
}
