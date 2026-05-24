export default async function execute(input, context) {
    const services = context.services;
    const toolRegistry = services.getToolRegistry();
    const tools = toolRegistry.getAllTools();
    if (tools.length === 0) {
        return {
            success: true,
            message: 'No tools currently loaded.'
        };
    }
    const list = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
    return {
        success: true,
        message: `Loaded Tools (${tools.length}):\n${list}`
    };
}
