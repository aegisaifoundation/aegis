export default async function execute(input, context) {
    try {
        const services = context.services;
        const runtimeStatus = services.getExecutor().getStatus();
        const modelProvider = services.getModelProvider();
        const toolRegistry = services.getToolRegistry();
        const pluginRegistry = services.getPluginRegistry();
        const config = services.getConfig();
        // Check model availability
        const modelAvailable = await modelProvider.checkModelAvailability();
        const tools = toolRegistry.getAllTools();
        const toolCount = tools.length;
        const commandCount = services.getRegistry().list().length;
        const plugins = pluginRegistry.list();
        const pluginCount = plugins.length;
        const pluginsSummary = plugins.map((p) => `  - ${p.name} (v${p.version}) [${pluginRegistry.getPluginState(p.name)}]`).join('\n') || '  No plugins loaded.';
        const skillRegistry = services.getSkillRegistry();
        const skills = skillRegistry.list();
        const skillCount = skills.length;
        const skillsSummary = skills.map((s) => `  - ${s.name} (v${s.version}) [${skillRegistry.getSkillState(s.name)}]`).join('\n') || '  No skills loaded.';
        const toolsSummary = tools.map((t) => `  - ${t.name}: ${t.description}`).join('\n') || '  No tools loaded.';
        const message = [
            `=== AEGIS Runtime Status ===`,
            `State: ${runtimeStatus}`,
            `Loaded Tools: ${toolCount}`,
            `Loaded Commands: ${commandCount}`,
            `Loaded Plugins: ${pluginCount}`,
            `Loaded Skills: ${skillCount}`,
            ``,
            `=== Loaded Tools ===`,
            toolsSummary,
            ``,
            `=== Loaded Plugins ===`,
            pluginsSummary,
            ``,
            `=== Loaded Skills ===`,
            skillsSummary,
            ``,
            `=== Model Provider Stats ===`,
            `Provider: ${modelProvider.getActiveProviderName()}`,
            `Model: ${config.MODEL_NAME}`,
            `Status: ${modelAvailable ? 'CONNECTED (Available)' : 'DISCONNECTED (Unavailable)'}`
        ].join('\n');
        return {
            success: true,
            message
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to retrieve status: ${err.message}`
        };
    }
}
