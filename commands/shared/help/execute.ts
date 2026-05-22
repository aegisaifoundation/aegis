import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const commands = context.services.getRegistry().list();
  const list = commands
    .map((c: any) => `/${c.name} - ${c.description}`)
    .join('\n');
  return {
    success: true,
    message: `Available Commands:\n${list}`
  };
}
