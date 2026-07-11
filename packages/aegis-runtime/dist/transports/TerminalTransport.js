import readline from 'readline';
import { runtimeExecutor } from '../services/RuntimeExecutor.js';
import { commandRouter } from '../commands/index.js';
import { eventBus } from '../eventbus/EventBus.js';
export class TerminalTransport {
    async initialize() {
        this.startReadlineLoop();
    }
    startReadlineLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '\n> '
        });
        console.log("AEGIS Core booted. Type a command (e.g. /help) or prompt to begin.");
        eventBus.on('response_chunk', (envelope) => {
            process.stdout.write(envelope.payload);
        });
        eventBus.on('response_finished', (envelope) => {
            process.stdout.write('\n');
        });
        eventBus.on('tool_started', (envelope) => {
            const msg = envelope.payload;
            console.log(`\n[Tool execution: ${msg.name} started]`);
        });
        eventBus.on('tool_finished', (envelope) => {
            const msg = envelope.payload;
            console.log(`[Tool execution: ${msg.name} finished]`);
        });
        eventBus.on('runtime_error', (envelope) => {
            console.error(`\n[Runtime Error: ${envelope.payload}]`);
        });
        rl.prompt();
        rl.on('line', async (line) => {
            const query = line.trim();
            if (query) {
                try {
                    await this.sendInput(query);
                }
                catch (e) {
                    console.error(`\n[System Error: ${e.message}]`);
                }
            }
            rl.prompt();
        });
        rl.on('close', () => {
            console.log('Exiting Aegis.');
            process.exit(0);
        });
    }
    async sendInput(input) {
        const trimmed = input.trim();
        if (trimmed.startsWith('/')) {
            const commandResult = await commandRouter.handleCommand(trimmed);
            if (commandResult !== null) {
                eventBus.emit('response_started');
                eventBus.emit('response_chunk', commandResult);
                eventBus.emit('response_finished', commandResult);
                return;
            }
        }
        await runtimeExecutor.execute(input);
    }
    sendInterrupt() {
        runtimeExecutor.interrupt();
    }
}
export const terminalTransport = new TerminalTransport();
