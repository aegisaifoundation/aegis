export default async function execute(input, context) {
    const services = context.services;
    const pluginRegistry = services.getPluginRegistry();
    const plugins = pluginRegistry.list();
    if (plugins.length === 0) {
        return {
            success: true,
            message: 'No plugins currently loaded.'
        };
    }
    const list = plugins.map((p) => `- ${p.name} (v${p.version}) [State: ${pluginRegistry.getPluginState(p.name)}]: ${p.description}`).join('\n');
    return {
        success: true,
        message: `Loaded Plugins (${plugins.length}):\n${list}`
    };
}
