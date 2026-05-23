import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const args = input.trim().split(/\s+/).filter(Boolean);
  if (args.length < 1) {
    return {
      success: false,
      message: 'Usage: /switch <provider-name>. Example: /switch mock'
    };
  }

  const targetProvider = args[0];

  try {
    const providerManager = context.services.getModelProvider();
    await providerManager.switchProvider(targetProvider);

    return {
      success: true,
      message: `Successfully switched active provider to: ${targetProvider}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to switch provider to '${targetProvider}': ${err.message}`
    };
  }
}
