export interface IMemoryProvider {
  name: string;
  query(text: string, options?: Record<string, any>): Promise<any[]>;
  store(id: string, vector: number[], payload: Record<string, any>): Promise<void>;
  delete(id: string): Promise<boolean>;
}
