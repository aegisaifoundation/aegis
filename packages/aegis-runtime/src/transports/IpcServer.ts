import net from 'net';
import fs from 'fs';
import { getIpcPath } from './IpcPath.js';
import { IpcRequest, IpcResponse, CURRENT_IPC_VERSION } from './IpcProtocol.js';
import { engineManager } from '../managers/EngineManager.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';

export class IpcServer {
  private server: net.Server | null = null;

  constructor(private workspacePath: string) {}

  public start(): void {
    const ipcPath = getIpcPath(this.workspacePath);

    if (process.platform !== 'win32' && fs.existsSync(ipcPath)) {
      try {
        fs.unlinkSync(ipcPath);
      } catch {}
    }

    this.server = net.createServer((socket) => {
      socket.on('data', async (data) => {
        let reqId = 'unknown';
        let cmd = 'unknown';
        try {
          const req: IpcRequest = JSON.parse(data.toString());
          reqId = req.requestId || 'unknown';
          cmd = req.command || 'unknown';

          // Enforce protocol version check
          if (req.version !== CURRENT_IPC_VERSION) {
            const errResponse: IpcResponse = {
              version: CURRENT_IPC_VERSION,
              requestId: reqId,
              command: cmd,
              error: `Incompatible protocol version. Expected "${CURRENT_IPC_VERSION}", received "${req.version}"`
            };
            socket.write(JSON.stringify(errResponse));
            return;
          }

          let result: any = null;

          switch (req.command) {
            case 'reload':
              await engineManager.reload();
              result = { success: true, message: 'All engines reloaded successfully' };
              break;
            case 'reloadEngine':
              if (!req.payload || !req.payload.engineId) {
                throw new Error('Missing engineId in payload');
              }
              await engineManager.reloadEngine(req.payload.engineId);
              result = { success: true, message: `Engine "${req.payload.engineId}" reloaded successfully` };
              break;
            case 'startEngine':
              if (!req.payload || !req.payload.engineId) {
                throw new Error('Missing engineId in payload');
              }
              await engineManager.startEngine(req.payload.engineId);
              result = { success: true, message: `Engine "${req.payload.engineId}" started successfully` };
              break;
            case 'stopEngine':
              if (!req.payload || !req.payload.engineId) {
                throw new Error('Missing engineId in payload');
              }
              await engineManager.stopEngine(req.payload.engineId);
              result = { success: true, message: `Engine "${req.payload.engineId}" stopped successfully` };
              break;
            case 'status':
              const engines = engineManager.list().map(e => ({
                id: e.metadata.id,
                displayName: e.metadata.displayName,
                autoStart: e.metadata.autoStart,
                version: e.metadata.version,
                state: (e as any).getState ? (e as any).getState() : 'UNKNOWN',
                pid: (e as any).getPid ? (e as any).getPid() : undefined,
                uptimeMs: (e as any).getUptimeMs ? (e as any).getUptimeMs() : undefined,
              }));
              result = { success: true, engines };
              break;
            case 'engineInfo':
              if (!req.payload || !req.payload.engineId) {
                throw new Error('Missing engineId in payload');
              }
              const targetEngine = engineManager.get(req.payload.engineId);
              if (!targetEngine) {
                throw new Error(`Engine "${req.payload.engineId}" is not loaded`);
              }
              const healthReport = await targetEngine.health();
              result = {
                success: true,
                info: {
                  metadata: targetEngine.metadata,
                  health: healthReport,
                  state: (targetEngine as any).getState ? (targetEngine as any).getState() : 'UNKNOWN',
                  pid: (targetEngine as any).getPid ? (targetEngine as any).getPid() : undefined,
                  uptimeMs: (targetEngine as any).getUptimeMs ? (targetEngine as any).getUptimeMs() : undefined,
                  restartCount: (targetEngine as any).getRestartCount ? (targetEngine as any).getRestartCount() : 0,
                  startedAt: (targetEngine as any).getStartedAt ? (targetEngine as any).getStartedAt() : undefined,
                }
              };
              break;
            case 'node:register': {
              if (!req.payload || !req.payload.nodeId || !req.payload.host || !req.payload.port) {
                throw new Error('Missing nodeId, host, or port in payload');
              }
              const disc = serviceRegistry.get<any>('distributed-intelligence:discovery');
              if (!disc) {
                throw new Error('DiscoveryService is not loaded in serviceRegistry');
              }
              await disc.registerNode(req.payload.nodeId, req.payload.host, Number(req.payload.port));
              result = { success: true, message: `Node "${req.payload.nodeId}" registered successfully.` };
              break;
            }
            case 'node:unregister': {
              if (!req.payload || !req.payload.nodeId) {
                throw new Error('Missing nodeId in payload');
              }
              const disc = serviceRegistry.get<any>('distributed-intelligence:discovery');
              if (!disc) {
                throw new Error('DiscoveryService is not loaded in serviceRegistry');
              }
              if (disc.removeNode) {
                await disc.removeNode(req.payload.nodeId);
              } else {
                (disc as any).localPeers?.delete(req.payload.nodeId);
              }
              result = { success: true, message: `Node "${req.payload.nodeId}" unregistered successfully.` };
              break;
            }
            case 'node:list': {
              const disc = serviceRegistry.get<any>('distributed-intelligence:discovery');
              if (!disc) {
                throw new Error('DiscoveryService is not loaded in serviceRegistry');
              }
              const peers = disc.getLocalPeers ? disc.getLocalPeers() : [];
              result = { success: true, peers };
              break;
            }
            case 'node:connect': {
              if (!req.payload || !req.payload.nodeId) {
                throw new Error('Missing nodeId in payload');
              }
              const engine = serviceRegistry.get<any>('distributed-intelligence');
              if (!engine) {
                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
              }
              await engine.requestConnection(req.payload.nodeId);
              result = { success: true, message: `Connection request sent to "${req.payload.nodeId}".` };
              break;
            }
            case 'node:requests': {
              const engine = serviceRegistry.get<any>('distributed-intelligence');
              if (!engine) {
                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
              }
              const requests = await engine.getConnectionRequests();
              result = { success: true, requests };
              break;
            }
            case 'node:accept': {
              if (!req.payload || !req.payload.requestId) {
                throw new Error('Missing requestId in payload');
              }
              const engine = serviceRegistry.get<any>('distributed-intelligence');
              if (!engine) {
                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
              }
              await engine.acceptConnectionRequest(req.payload.requestId);
              result = { success: true, message: `Accepted connection request "${req.payload.requestId}".` };
              break;
            }
            case 'shutdown':
              setTimeout(() => {
                process.exit(0);
              }, 100);
              result = { success: true, message: 'Shutdown command initiated' };
              break;
            default:
              throw new Error(`Unsupported IPC command: ${req.command}`);
          }

          const response: IpcResponse = {
            version: CURRENT_IPC_VERSION,
            requestId: reqId,
            command: cmd,
            result
          };
          socket.write(JSON.stringify(response));

        } catch (err: any) {
          const response: IpcResponse = {
            version: CURRENT_IPC_VERSION,
            requestId: reqId,
            command: cmd,
            error: err.message || String(err)
          };
          socket.write(JSON.stringify(response));
        } finally {
          socket.end();
        }
      });

      socket.on('error', (err) => {
        console.error('[IpcServer] Socket error:', err);
      });
    });

    this.server.listen(ipcPath, () => {
      console.log(`[IpcServer] Bound control channel listening at ${ipcPath}`);
    });

    this.server.on('error', (err) => {
      console.error('[IpcServer] Server binding failed:', err);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
