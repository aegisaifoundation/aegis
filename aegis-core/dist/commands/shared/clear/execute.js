export default async function execute(input, context) {
    try {
        await context.services.getConversationContext().clear();
        return {
            success: true,
            message: 'Conversation context and memory successfully cleared.'
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to clear memory: ${err.message}`
        };
    }
}
