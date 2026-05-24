export default async function execute(input, context) {
    const commands = context.services.getRegistry().list();
    const list = commands
        .map((c) => `/${c.name} - ${c.description}`)
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
