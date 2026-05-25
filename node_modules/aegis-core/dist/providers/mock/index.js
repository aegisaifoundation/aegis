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
        const lastMsg = messages[messages.length - 1];
        const lastContent = lastMsg?.content || '';
        const lastRole = lastMsg?.role;
        let responseText = '';
        if (lastRole === 'user' && lastContent.toLowerCase().includes('my name is')) {
            const match = lastContent.match(/my name is\s+(\w+)/i);
            const name = match ? match[1] : 'Gokul';
            responseText = `<tool>{"name": "memory-write", "input": {"action": "write", "key": "user.name", "value": "${name}"}}</tool>`;
        }
        else if (lastRole === 'tool' && messages[messages.length - 2]?.content.includes('memory-write')) {
            responseText = "I've saved your name in my profile memory.";
        }
        else if (lastRole === 'user' && lastContent.toLowerCase().includes('who am i')) {
            responseText = `<tool>{"name": "memory-read", "input": {"action": "read", "key": "user.name"}}</tool>`;
        }
        else if (lastRole === 'tool' && messages[messages.length - 2]?.content.includes('memory-read')) {
            try {
                const parsed = JSON.parse(lastContent);
                responseText = `You told me your name is ${parsed.value || 'unknown'}.`;
            }
            catch (e) {
                responseText = `Your name is Gokul.`;
            }
        }
        else {
            responseText = `[Mock Response to: "${lastContent}"] This is a mock response from the Mock Provider.`;
        }
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
