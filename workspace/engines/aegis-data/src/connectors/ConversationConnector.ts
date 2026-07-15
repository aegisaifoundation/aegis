import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import { serviceRegistry } from '@aegis/runtime';

export class ConversationConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'Conversation';
  private connected = false;
  private isEnabled = false;

  constructor(id: string) {
    this.id = id;
  }

  async connect(config?: { enabled?: boolean }): Promise<void> {
    // Must be explicitly enabled in config
    this.isEnabled = config?.enabled === true;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.isEnabled = false;
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');
    if (!this.isEnabled) {
      throw new Error('Conversation history integration is disabled by default and has not been explicitly enabled.');
    }

    const conversationContext = serviceRegistry.get<any>('conversationContext');
    if (!conversationContext) {
      return [];
    }

    const messages = await conversationContext.getMessages();
    if (!messages) return [];

    return messages.map((msg: any) => ({
      id: `conv-${msg.id}`,
      content: msg.content,
      metadata: {
        role: msg.role,
        createdAt: msg.createdAt || new Date().toISOString(),
        source: 'conversationContext'
      }
    }));
  }

  async validate(): Promise<boolean> {
    return this.connected && this.isEnabled && serviceRegistry.has('conversationContext');
  }

  async watch(onChange: (event: any) => void): Promise<void> {}

  async metadata(): Promise<Record<string, any>> {
    return {
      connected: this.connected,
      enabled: this.isEnabled
    };
  }

  async statistics(): Promise<Record<string, any>> {
    if (!this.isEnabled) {
      return { status: 'Disabled' };
    }
    const samples = await this.collect();
    return {
      messagesCount: samples.length
    };
  }
}
