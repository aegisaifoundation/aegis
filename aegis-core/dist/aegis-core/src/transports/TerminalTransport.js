import React from 'react';
import { render } from 'ink';
import { App } from '../../../interfaces/terminal/App.js';
import { runtimeExecutor } from '../runtime/index.js';
import { commandRouter } from '../commands/index.js';
import { eventBus } from '../runtime/index.js';
export class TerminalTransport {
    async initialize() {
        render(React.createElement(App));
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
