export default async function execute(input, context) {
    const args = input.trim().split(/\s+/).filter(Boolean);
    if (args.length < 1) {
        return {
            success: false,
            message: 'Usage: /switch <provider-name>. Example: /switch mock'
        };
    }
    const targetProvider = args[0];
    try {
        const providerManager = context.services.getModelProvider();
        await providerManager.switchProvider(targetProvider);
        return {
            success: true,
            message: `Successfully switched active provider to: ${targetProvider}`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to switch provider to '${targetProvider}': ${err.message}`
        };
    }
}
