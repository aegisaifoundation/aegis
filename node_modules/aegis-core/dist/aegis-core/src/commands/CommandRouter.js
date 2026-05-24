import { commandRegistry } from './CommandRegistry.js';
import { commandPermissionManager } from './CommandPermissionManager.js';
import { runtimeServices } from './RuntimeServices.js';
import { eventBus } from '../runtime/EventBus.js';
export class CommandRouter {
    async handleInvocation(invocation) {
        const { command: cmdName, args, rawInput } = invocation;
        const command = commandRegistry.get(cmdName);
        if (!command) {
            return `Unrecognized command: /${cmdName}. Type /help for available commands.`;
        }
        // Validate permissions before execution
        if (!commandPermissionManager.validate(command.permissions)) {
            return `Access denied: Command /${command.name} requires permissions: ${(command.permissions || []).join(', ')}`;
        }
        try {
            const context = {
                services: runtimeServices,
                permissions: command.permissions || []
            };
            const argsString = args.join(' ');
            eventBus.emit('command_started', { name: command.name, input: argsString });
            const result = await command.execute(argsString, context);
            eventBus.emit('command_executed', { name: command.name, success: result.success });
            if (result.success) {
                return result.message || result.output || `Command /${command.name} executed successfully.`;
            }
            else {
                return `Command error: ${result.message || 'Unknown error'}`;
            }
        }
        catch (err) {
            eventBus.emit('command_failed', { name: command.name, error: err.message });
            return `Failed to execute command /${command.name}: ${err.message}`;
        }
    }
    async handleCommand(input) {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/'))
            return null;
        // Parse slash command: /commandName arg1 arg2
        const parts = trimmed.split(/\s+/).filter(Boolean);
        const cmdName = parts[0].slice(1).toLowerCase();
        const args = parts.slice(1);
        const invocation = {
            command: cmdName,
            args,
            rawInput: trimmed,
            source: 'terminal'
        };
        return await this.handleInvocation(invocation);
    }
}
export const commandRouter = new CommandRouter();
