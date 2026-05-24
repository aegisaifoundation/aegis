export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'workflow' | 'event' | 'runtime' | 'observation';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
