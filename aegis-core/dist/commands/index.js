import { memoryManager } from '../memory/index.js';
import { toolRegistry } from '../tools/index.js';
export class CommandRouter {
    async handleCommand(input) {
        const cmd = input.trim().toLowerCase();
        if (cmd === '/help') {
            return 'Available Commands:\n/help - Show this message\n/tools - List active tools\n/memory - Show memory stats\n/clear - Clear session memory\n/model - Show current model\n/exit - Quit Aegis';
        }
        if (cmd === '/tools') {
            const tools = toolRegistry.getAllTools();
            return `Loaded Tools (${tools.length}):\n${tools.map(t => `- ${t.name}`).join('\n')}`;
        }
        if (cmd === '/memory') {
            const mems = memoryManager.getMemories();
            return `Memory: ${mems.length} messages in current session.`;
        }
        if (cmd === '/clear') {
            await memoryManager.clear();
            return 'Memory cleared.';
        }
        if (cmd === '/model') {
            return `Model is configured. Check logs for availability status.`;
        }
        if (cmd === '/exit') {
            process.exit(0);
        }
        return null; // Not a recognized slash command
    }
}
export const commandRouter = new CommandRouter();
