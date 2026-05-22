import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const services = context.services;
  const skillRegistry = services.getSkillRegistry();
  const skills = skillRegistry.list();
  
  if (skills.length === 0) {
    return {
      success: true,
      message: 'No skills currently loaded.'
    };
  }
  
  const list = skills.map((s: any) => `- ${s.name} (v${s.version}) [State: ${skillRegistry.getSkillState(s.name)}]: ${s.description}`).join('\n');
  return {
    success: true,
    message: `Loaded Skills (${skills.length}):\n${list}`
  };
}
