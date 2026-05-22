import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const args = input.trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) {
    return {
      success: false,
      message: 'Error: Please specify the tool name. Example: /unregister FileTool'
    };
  }
  const toolName = args[0];
  try {
    const services = context.services;
    const toolRegistry = services.getToolRegistry();
    const configurationManager = services.getConfigurationManager();

    const tool = toolRegistry.getTool(toolName);
    if (!tool) {
      return {
        success: false,
        message: `Error: Tool '${toolName}' is not registered.`
      };
    }
    const toolPath = tool.toolPath;
    const unregistered = toolRegistry.unregister(toolName);
    if (unregistered && toolPath) {
      await configurationManager.updateAutoloadTools('remove', toolPath);
    }
    return {
      success: true,
      message: `Successfully unregistered tool: ${toolName}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to unregister tool: ${err.message}`
    };
  }
}
