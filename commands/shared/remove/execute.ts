import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { CapabilityType } from '../../../aegis-core/src/runtime/CapabilityManager.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  const args = input.trim().split(/\s+/).filter(Boolean);
  if (args.length < 2) {
    return {
      success: false,
      message: 'Usage: /remove <tool|plugin|skill|provider> <path>. Example: /remove plugin shared/analytics'
    };
  }

  const typeArg = args[0].toLowerCase();
  const capabilityPath = args[1];

  let type: CapabilityType;
  if (typeArg === 'tool') {
    type = CapabilityType.TOOL;
  } else if (typeArg === 'plugin') {
    type = CapabilityType.PLUGIN;
  } else if (typeArg === 'skill') {
    type = CapabilityType.SKILL;
  } else if (typeArg === 'provider') {
    type = CapabilityType.PROVIDER;
  } else {
    return {
      success: false,
      message: `Error: Unsupported capability type '${args[0]}'. Allowed types are 'tool', 'plugin', 'skill', or 'provider'.`
    };
  }

  try {
    const capabilityManager = context.services.getCapabilityManager();
    await capabilityManager.remove(type, capabilityPath);
    return {
      success: true,
      message: `Successfully removed ${typeArg}: ${capabilityPath}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to remove ${typeArg} '${capabilityPath}': ${err.message}`
    };
  }
}
