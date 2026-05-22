import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const commands = context.services.getRegistry().list();
  const list = commands
    .map((c: any) => `/${c.name} - ${c.description}`)
    .join('\n');
  
  const examples = '\n\nExamples:\n' +
    '  /add <tool|plugin> <path>     e.g., /add plugin shared/analytics\n' +
    '  /remove <tool|plugin> <path>  e.g., /remove plugin shared/analytics\n' +
    '  /update <tool|plugin> <path>  e.g., /update plugin shared/analytics';

  return {
    success: true,
    message: `Available Commands:\n${list}${examples}`
  };
}
