import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const services = context.services;
    const runtimeStatus = services.getExecutor().getStatus();
    const modelProvider = services.getModelProvider();
    const toolRegistry = services.getToolRegistry();
    const pluginRegistry = services.getPluginRegistry();
    const config = services.getConfig();
    
    // Check model availability
    const modelAvailable = await modelProvider.checkModelAvailability();
    const toolCount = toolRegistry.getAllTools().length;
    const commandCount = services.getRegistry().list().length;
    const plugins = pluginRegistry.list();
    const pluginsSummary = plugins.map((p: any) => `  - ${p.name} (v${p.version}) [${pluginRegistry.getPluginState(p.name)}]`).join('\n') || '  No plugins loaded.';
    
    const message = [
      `=== AEGIS Runtime Status ===`,
      `State: ${runtimeStatus}`,
      `Loaded Tools: ${toolCount}`,
      `Loaded Commands: ${commandCount}`,
      ``,
      `=== Loaded Plugins ===`,
      pluginsSummary,
      ``,
      `=== Model Provider Stats ===`,
      `Host: ${config.OLLAMA_HOST}`,
      `Model: ${config.MODEL_NAME}`,
      `Status: ${modelAvailable ? 'CONNECTED (Available)' : 'DISCONNECTED (Unavailable)'}`
    ].join('\n');

    return {
      success: true,
      message
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to retrieve status: ${err.message}`
    };
  }
}
