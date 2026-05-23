import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const commands = context.services.getRegistry().list();
  const list = commands
    .map((c: any) => `/${c.name} - ${c.description}`)
    .join('\n');
  
  const examples = '\n\nExamples:\n' +
    '  /add <tool|plugin|skill|provider> <path>     e.g., /add plugin shared/analytics\n' +
    '  /remove <tool|plugin|skill|provider> <path>  e.g., /remove tool MemoryTool\n' +
    '  /update <tool|plugin|skill|provider> <path>  e.g., /update skill shared/summarize';

  return {
    success: true,
    message: `Available Commands:\n${list}${examples}`
  };
}
