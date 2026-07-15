export interface RawSample {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

export interface IDataConnector {
  readonly id: string;
  readonly type: string;
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  collect(): Promise<RawSample[]>;
  validate(): Promise<boolean>;
  watch(onChange: (event: any) => void): Promise<void>;
  metadata(): Promise<Record<string, any>>;
  statistics(): Promise<Record<string, any>>;
}
