import { Command } from './Command.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { conversationContext } from '../context/ConversationContext.js';
import { config } from '../config/index.js';

const toolLoader = new ToolLoader();

export class CommandRouter {
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  register(command: Command) {
    this.commands.set(command.name.toLowerCase(), command);
  }

  async handleCommand(input: string): Promise<string | null> {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return null;

    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = this.commands.get(cmdName);
    if (cmd) {
      return await cmd.execute(args);
    }

    return `Unrecognized command: ${cmdName}. Type /help for available commands.`;
  }

  private registerDefaultCommands() {
    this.register({
      name: '/help',
      description: 'Show available commands',
      execute: async () => {
        const list = Array.from(this.commands.values())
          .map(c => `${c.name} - ${c.description}`)
          .join('\n');
        return `Available Commands:\n${list}`;
      }
    });

    this.register({
      name: '/tools',
      description: 'List active tools',
      execute: async () => {
        const tools = toolRegistry.getAllTools();
        if (tools.length === 0) return 'No tools currently loaded.';
        return `Loaded Tools (${tools.length}):\n${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`;
      }
    });

    this.register({
      name: '/memory',
      description: 'Show memory stats',
      execute: async () => {
        const mems = await conversationContext.getMessages();
        return `Memory: ${mems.length} messages in current session.`;
      }
    });

    this.register({
      name: '/clear',
      description: 'Clear session memory',
      execute: async () => {
        await conversationContext.clear();
        return 'Memory cleared.';
      }
    });

    this.register({
      name: '/model',
      description: 'Show current model config',
      execute: async () => {
        return `Model: ${config.MODEL_NAME} (Host: ${config.OLLAMA_HOST})`;
      }
    });

    this.register({
      name: '/register',
      description: 'Register a tool package dynamically, e.g., /register shared/FileTool',
      execute: async (args) => {
        if (!args || args.length === 0) {
          return 'Error: Please specify the tool path. Example: /register shared/FileTool';
        }
        const toolPath = args[0];
        try {
          const tool = await toolLoader.loadTool(toolPath);
          toolRegistry.register(tool);
          return `Successfully registered tool: ${tool.name} (version ${tool.version})`;
        } catch (err: any) {
          return `Failed to register tool: ${err.message}`;
        }
      }
    });

    this.register({
      name: '/reregister',
      description: 'Reregister/reload a tool package, e.g., /reregister shared/FileTool',
      execute: async (args) => {
        if (!args || args.length === 0) {
          return 'Error: Please specify the tool path. Example: /reregister shared/FileTool';
        }
        const toolPath = args[0];
        try {
          const tool = await toolLoader.loadTool(toolPath);
          const unregistered = toolRegistry.unregister(tool.name);
          toolRegistry.register(tool);
          return `${unregistered ? 'Unloaded previous version and successfully' : 'Successfully'} registered tool: ${tool.name} (version ${tool.version})`;
        } catch (err: any) {
          return `Failed to reregister tool: ${err.message}`;
        }
      }
    });

    this.register({
      name: '/unregister',
      description: 'Unregister/unload a tool by name, e.g., /unregister FileTool',
      execute: async (args) => {
        if (!args || args.length === 0) {
          return 'Error: Please specify the tool name. Example: /unregister FileTool';
        }
        const toolName = args[0];
        const success = toolRegistry.unregister(toolName);
        if (success) {
          return `Successfully unregistered tool: ${toolName}`;
        } else {
          return `Tool '${toolName}' is not currently registered.`;
        }
      }
    });

    this.register({
      name: '/exit',
      description: 'Quit Aegis',
      execute: async () => {
        process.exit(0);
      }
    });
  }
}

export const commandRouter = new CommandRouter();
