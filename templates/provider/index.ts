import { Provider, ChatMessage } from '../../aegis-core/src/providers/Provider.js';
import { ProviderContext } from '../../aegis-core/src/providers/ProviderContext.js';

export class CustomProvider implements Provider {
  name = 'custom/my-custom-provider';
  category = 'custom';
  version = '1.0.0';

  async initialize(context: ProviderContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info('Custom provider initializing...');
    // Access configuration via: context.config
  }

  async shutdown(): Promise<void> {
    // Perform cleanup if needed
  }

  async checkAvailability(): Promise<boolean> {
    // Return whether the underlying model or API is accessible
    return true;
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    // Generate responses token-by-token
    yield "Hello, this is a response from the custom provider template!";
  }

  async generate(prompt: string): Promise<string> {
    // Generate prompt response
    return "This is a prompt response from the custom provider template.";
  }
}

export default new CustomProvider();
