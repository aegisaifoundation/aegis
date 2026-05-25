import { Provider, ChatMessage } from '../../aegis-core/src/providers/Provider.js';
import { ProviderContext } from '../../aegis-core/src/providers/ProviderContext.js';

export class MockProvider implements Provider {
  name = 'mock';
  category = 'mock';
  version = '1.0.0';

  async initialize(context: ProviderContext): Promise<void> {
    // Mock initialization is always successful
  }

  async shutdown(): Promise<void> {
    // No cleanup required
  }

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const lastMsg = messages[messages.length - 1];
    const lastContent = lastMsg?.content || '';
    const lastRole = lastMsg?.role;

    let responseText = '';

    if (lastRole === 'user' && lastContent.toLowerCase().includes('my name is')) {
      const match = lastContent.match(/my name is\s+(\w+)/i);
      const name = match ? match[1] : 'Gokul';
      responseText = `<tool>{"name": "memory-write", "input": {"action": "write", "key": "user.name", "value": "${name}"}}</tool>`;
    } else if (lastRole === 'tool' && messages[messages.length - 2]?.content.includes('memory-write')) {
      responseText = "I've saved your name in my profile memory.";
    } else if (lastRole === 'user' && lastContent.toLowerCase().includes('who am i')) {
      responseText = `<tool>{"name": "memory-read", "input": {"action": "read", "key": "user.name"}}</tool>`;
    } else if (lastRole === 'tool' && messages[messages.length - 2]?.content.includes('memory-read')) {
      try {
        const parsed = JSON.parse(lastContent);
        responseText = `You told me your name is ${parsed.value || 'unknown'}.`;
      } catch (e) {
        responseText = `Your name is Gokul.`;
      }
    } else {
      responseText = `[Mock Response to: "${lastContent}"] This is a mock response from the Mock Provider.`;
    }

    const chunks = responseText.split(' ');
    for (const chunk of chunks) {
      yield chunk + ' ';
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async generate(prompt: string): Promise<string> {
    return `[Mock Response] Generate response for: ${prompt}`;
  }
}

export default new MockProvider();
