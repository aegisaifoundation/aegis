export class MockProvider {
    name = 'mock';
    category = 'mock';
    version = '1.0.0';
    async initialize(context) {
        // Mock initialization is always successful
    }
    async shutdown() {
        // No cleanup required
    }
    async checkAvailability() {
        return true;
    }
    async *streamChat(messages) {
        const lastMsg = messages[messages.length - 1]?.content || '';
        const responseText = `[Mock Response to: "${lastMsg}"] This is a mock response from the Mock Provider.`;
        const chunks = responseText.split(' ');
        for (const chunk of chunks) {
            yield chunk + ' ';
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    async generate(prompt) {
        return `[Mock Response] Generate response for: ${prompt}`;
    }
}
export default new MockProvider();
