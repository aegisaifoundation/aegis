export interface ITransportAdapter {
  readonly transportType: 'tcp' | 'native_tcp' | 'websocket' | string;
  listen(port: number, host?: string): Promise<number>; // Returns actual bound port
  connect(host: string, port: number): Promise<any>;
  send(socket: any, payload: string): Promise<void>;
  disconnect(socket: any): Promise<void>;
  onConnection(callback: (socket: any, remoteAddr: string) => void): void;
  onMessage(callback: (socket: any, payload: string) => void): void;
  onDisconnect(callback: (socket: any) => void): void;
  onError(callback: (err: Error) => void): void;
  stop(): Promise<void>;
}
