import { ITransportAdapter } from './ITransportAdapter.js';

export class NativeTcpTransportAdapter implements ITransportAdapter {
  readonly transportType = 'native_tcp';
  private connectionCallbacks = new Set<(socket: any, remoteAddr: string) => void>();
  private messageCallbacks = new Set<(socket: any, payload: string) => void>();
  private disconnectCallbacks = new Set<(socket: any) => void>();
  private errorCallbacks = new Set<(err: Error) => void>();

  constructor(private ipcManagerProvider: () => any) {}

  async listen(port: number, host = '0.0.0.0'): Promise<number> {
    const ipc = this.ipcManagerProvider();
    if (!ipc) throw new Error('Native IPC Manager is not available');
    return port;
  }

  async connect(host: string, port: number): Promise<any> {
    return { host, port, type: 'native_handle' };
  }

  async send(socket: any, payload: string): Promise<void> {
    const ipc = this.ipcManagerProvider();
    if (!ipc) throw new Error('Native IPC Manager is not available');
    await ipc.request(1, { action: 'send_message', targetHost: socket.host, targetPort: socket.port, payload });
  }

  async disconnect(socket: any): Promise<void> {}

  onConnection(callback: (socket: any, remoteAddr: string) => void): void {
    this.connectionCallbacks.add(callback);
  }

  onMessage(callback: (socket: any, payload: string) => void): void {
    this.messageCallbacks.add(callback);
  }

  onDisconnect(callback: (socket: any) => void): void {
    this.disconnectCallbacks.add(callback);
  }

  onError(callback: (err: Error) => void): void {
    this.errorCallbacks.add(callback);
  }

  async stop(): Promise<void> {}
}
