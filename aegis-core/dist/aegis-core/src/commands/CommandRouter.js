import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { conversationContext } from '../context/ConversationContext.js';
import { config } from '../config/index.js';
import { eventBus } from '../runtime/EventBus.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getAegisCoreRoot() {
    let current = __dirname;
    while (true) {
        const packageJson = path.join(current, 'package.json');
        if (fs.existsSync(packageJson)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                if (pkg.name === 'aegis-core') {
                    return current;
                }
            }
            catch (e) {
                // ignore parsing issues
            }
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return process.cwd();
}
function updateAutoloadTools(action, toolPath) {
    const coreRoot = getAegisCoreRoot();
    const configPath = path.resolve(coreRoot, 'src/config/runtime.json');
    try {
        if (!fs.existsSync(configPath))
            return;
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!configData.autoloadTools) {
            configData.autoloadTools = [];
        }
        if (action === 'add') {
            if (!configData.autoloadTools.includes(toolPath)) {
                configData.autoloadTools.push(toolPath);
            }
        }
        else if (action === 'remove') {
            configData.autoloadTools = configData.autoloadTools.filter((p) => p !== toolPath);
        }
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    }
    catch (err) {
        console.error(`Failed to update autoloadTools in runtime.json:`, err);
    }
}
const toolLoader = new ToolLoader();
export class CommandRouter {
    commands = new Map();
    constructor() {
        this.registerDefaultCommands();
    }
    register(command) {
        this.commands.set(command.name.toLowerCase(), command);
    }
    async handleCommand(input) {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/'))
            return null;
        const parts = trimmed.split(/\s+/);
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const cmd = this.commands.get(cmdName);
        if (cmd) {
            return await cmd.execute(args);
        }
        return `Unrecognized command: ${cmdName}. Type /help for available commands.`;
    }
    registerDefaultCommands() {
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
                if (tools.length === 0)
                    return 'No tools currently loaded.';
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
                    updateAutoloadTools('add', toolPath);
                    return `Successfully registered tool: ${tool.name} (version ${tool.version})`;
                }
                catch (err) {
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
                    eventBus.emit('tool_reloaded', { name: tool.name, version: tool.version });
                    updateAutoloadTools('add', toolPath);
                    return `${unregistered ? 'Unloaded previous version and successfully' : 'Successfully'} registered tool: ${tool.name} (version ${tool.version})`;
                }
                catch (err) {
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
                const tool = toolRegistry.getTool(toolName);
                const success = toolRegistry.unregister(toolName);
                if (success) {
                    if (tool && tool.toolPath) {
                        updateAutoloadTools('remove', tool.toolPath);
                    }
                    return `Successfully unregistered tool: ${toolName}`;
                }
                else {
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
