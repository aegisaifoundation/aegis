export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ModelProvider {
  checkAvailability(): Promise<boolean>;
  streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
  generate(prompt: string): Promise<string>;
}
