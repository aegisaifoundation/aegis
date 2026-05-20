import { toolRegistry } from '../tools/index.js';

export class CommandRouter {

  async handleCommand(
    input: string
  ): Promise<string | null> {

    const cmd =
      input.trim().toLowerCase();

    if (cmd === '/help') {

      return `
Available Commands:

/help   - Show this message
/tools  - List active tools
/model  - Show current model
/exit   - Quit Aegis
`;
    }

    if (cmd === '/tools') {

      const tools =
        toolRegistry.getAllTools();

      return `
Loaded Tools (${tools.length}):

${tools.map(t => `- ${t.name}`).join('\n')}
`;
    }

    if (cmd === '/model') {

      return `
Model is configured.
Check logs for availability status.
`;
    }

    if (cmd === '/exit') {

      process.exit(0);

    }

    return null;
  }
}

export const commandRouter =
  new CommandRouter();