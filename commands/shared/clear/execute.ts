import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    await context.services.getConversationContext().clear();
    return {
      success: true,
      message: 'Conversation context and memory successfully cleared.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to clear memory: ${err.message}`
    };
  }
}
