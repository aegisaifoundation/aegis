// Import only types to ensure modular decoupling.
// Never import value singletons directly using relative paths from aegis-core.
import type { CommandContext, CommandResult } from '../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const args = input.trim().split(/\s+/).filter(Boolean);
  
  try {
    // Use context.services to access registry, loader, config, etc.
    const services = context.services;
    const toolRegistry = services.getToolRegistry();
    const config = services.getConfig();

    // Example action logic...
    const outputMessage = `Template command executed with args: [${args.join(', ')}]. Workspace: ${services.getWorkspacePath()}`;

    return {
      success: true,
      message: outputMessage
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Template command failed: ${err.message}`
    };
  }
}
