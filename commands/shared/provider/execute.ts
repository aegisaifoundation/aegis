import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const providerManager = context.services.getModelProvider();
    const activeProvider = providerManager.getActiveProviderName();
    
    const { providerRegistry } = await import('../../../aegis-core/src/providers/index.js');
    const allProviders = providerRegistry.listNames();

    if (allProviders.length === 0) {
      return {
        success: true,
        message: 'No model providers are loaded.'
      };
    }

    const providerList = allProviders.map(p => {
      const state = providerRegistry.getProviderState(p);
      const isActive = p === activeProvider ? ' *ACTIVE*' : '';
      return `  - ${p} [${state}]${isActive}`;
    }).join('\n');

    return {
      success: true,
      message: `=== Available Model Providers ===\n${providerList}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to list providers: ${err.message}`
    };
  }
}
