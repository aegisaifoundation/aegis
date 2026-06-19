import axios from 'axios';
import { Provider, ChatMessage } from '../../../aegis-core/src/providers/Provider.js';
import { ProviderContext } from '../../../aegis-core/src/providers/ProviderContext.js';

export class GGUFProvider implements Provider {
  name = 'local/gguf';
  category = 'local';
  version = '1.0.0';
  private endpoint = 'http://127.0.0.1:5001/api/gguf/chat';

  async initialize(context: ProviderContext): Promise<void> {
    // Initialization is handled dynamically in the Python server
  }

  async shutdown(): Promise<void> {
    // No cleanup required
  }

  async checkAvailability(): Promise<boolean> {
    try {
      // Check if Python GGUF server is online and running
      const response = await axios.get('http://127.0.0.1:5001/api/gguf/lora/status', { timeout: 1000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await axios.post(this.endpoint, { messages }, { responseType: 'stream' });
    const stream = response.data;
    
    for await (const chunk of stream) {
      yield chunk.toString();
    }
  }

  async generate(prompt: string): Promise<string> {
    const response = await axios.post(this.endpoint, {
      messages: [{ role: 'user', content: prompt }]
    });
    // For non-streaming requests, the stream yields all data, but here we can just wait for completion.
    // However, since /api/gguf/chat streams raw text, let's write a simple helper or just read the full text.
    // Actually, calling the stream and joining it is extremely reliable.
    const stream = await axios.post(this.endpoint, {
      messages: [{ role: 'user', content: prompt }]
    }, { responseType: 'stream' });
    
    let text = '';
    for await (const chunk of stream.data) {
      text += chunk.toString();
    }
    return text;
  }
}

export default new GGUFProvider();
