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
    const lastMsg = messages[messages.length - 1]?.content || '';
    const responseText = `[Mock Response to: "${lastMsg}"] This is a mock response from the Mock Provider.`;
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
