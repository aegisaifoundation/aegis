import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    context.services.getEventBus().emit('runtime_shutdown_requested');
    return {
      success: true,
      message: 'Shutdown requested successfully.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to request shutdown: ${err.message}`
    };
  }
}
