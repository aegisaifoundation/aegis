export interface IProcessingPlugin {
  readonly id: string;
  readonly stage: 'clean' | 'normalize' | 'chunk' | 'tokenize' | 'deduplicate' | 'pii' | 'statistics';
  process(input: any, options?: any): Promise<any>;
}
