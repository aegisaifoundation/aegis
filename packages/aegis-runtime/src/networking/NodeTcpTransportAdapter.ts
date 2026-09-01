import net from 'net';
import { ITransportAdapter } from './ITransportAdapter.js';

export class NodeTcpTransportAdapter implements ITransportAdapter {
  readonly transportType = 'tcp';
  private server: net.Server | null = null;
  private connectionCallbacks = new Set<(socket: any, remoteAddr: string) => void>();
  private messageCallbacks = new Set<(socket: any, payload: string) => void>();
  private disconnectCallbacks = new Set<(socket: any) => void>();
  private errorCallbacks = new Set<(err: Error) => void>();

  async listen(port: number, host = '0.0.0.0'): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        const remoteAddr = `${socket.remoteAddress || '127.0.0.1'}:${socket.remotePort || 0}`;
        for (const cb of this.connectionCallbacks) {
          cb(socket, remoteAddr);
        }

        let buffer = Buffer.alloc(0);
        socket.on('data', (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
          while (buffer.length >= 4) {
            const payloadLen = buffer.readUInt32BE(0);
            if (buffer.length >= 4 + payloadLen) {
              const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
              buffer = buffer.subarray(4 + payloadLen);
              for (const cb of this.messageCallbacks) {
                cb(socket, payloadStr);
              }
            } else {
              break;
            }
          }
        });

        socket.on('close', () => {
          for (const cb of this.disconnectCallbacks) {
            cb(socket);
          }
        });

        socket.on('error', (err) => {
          for (const cb of this.errorCallbacks) {
            cb(err);
          }
        });
      });

      // Controlled port allocation: try requested port first, fallback to 0 (OS dynamic port)
      this.server.listen(port, host, () => {
        const address = this.server?.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`[AEGIS Transport] NodeTcpTransportAdapter listening on ${host}:${actualPort}`);
        resolve(actualPort);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && port !== 0) {
          console.warn(`[AEGIS Transport] Port ${port} occupied. Retrying with OS dynamic port allocation (port 0)...`);
          this.server?.listen(0, host, () => {
            const address = this.server?.address();
            const actualPort = typeof address === 'object' && address ? address.port : 0;
            console.log(`[AEGIS Transport] NodeTcpTransportAdapter bound to OS dynamic port ${host}:${actualPort}`);
            resolve(actualPort);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  async connect(host: string, port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = net.connect(port, host);
      client.setTimeout(5000);

      client.on('connect', () => {
        let buffer = Buffer.alloc(0);
        client.on('data', (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
          while (buffer.length >= 4) {
            const payloadLen = buffer.readUInt32BE(0);
            if (buffer.length >= 4 + payloadLen) {
              const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
              buffer = buffer.subarray(4 + payloadLen);
              for (const cb of this.messageCallbacks) {
                cb(client, payloadStr);
              }
            } else {
              break;
            }
          }
        });

        client.on('close', () => {
          for (const cb of this.disconnectCallbacks) {
            cb(client);
          }
        });

        client.on('error', (err) => {
          for (const cb of this.errorCallbacks) {
            cb(err);
          }
        });

        resolve(client);
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`Connection to ${host}:${port} timed out after 5000ms`));
      });

      client.on('error', reject);
    });
  }

  async send(socket: any, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!socket || socket.destroyed || !socket.writable) {
        return reject(new Error('Socket is not writable'));
      }
      const buf = Buffer.from(payload, 'utf8');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(buf.length, 0);
      socket.write(Buffer.concat([lenBuf, buf]), (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disconnect(socket: any): Promise<void> {
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  }

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

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
