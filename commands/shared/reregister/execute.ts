import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const args = input.trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) {
    return {
      success: false,
      message: 'Error: Please specify the tool path. Example: /reregister shared/FileTool'
    };
  }
  const toolPath = args[0];
  try {
    const services = context.services;
    const toolLoader = services.getToolLoader();
    const toolRegistry = services.getToolRegistry();
    const configurationManager = services.getConfigurationManager();

    const tool = await toolLoader.loadTool(toolPath);
    const unregistered = toolRegistry.unregister(tool.name);
    toolRegistry.register(tool);
    context.services.getEventBus().emit('tool_reloaded', { name: tool.name, version: tool.version });
    await configurationManager.updateAutoloadTools('add', toolPath);
    return {
      success: true,
      message: `${unregistered ? 'Unloaded previous version and successfully' : 'Successfully'} registered tool: ${tool.name} (version ${tool.version})`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reregister tool: ${err.message}`
    };
  }
}
