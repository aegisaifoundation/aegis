import net from 'net';
import fs from 'fs';
import { getIpcPath } from './IpcPath.js';
import { CURRENT_IPC_VERSION } from './IpcProtocol.js';
import { engineManager } from '../managers/EngineManager.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';
export class IpcServer {
    workspacePath;
    server = null;
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
    }
    start() {
        const ipcPath = getIpcPath(this.workspacePath);
        if (process.platform !== 'win32' && fs.existsSync(ipcPath)) {
            try {
                fs.unlinkSync(ipcPath);
            }
            catch { }
        }
        this.server = net.createServer((socket) => {
            socket.on('data', async (data) => {
                let reqId = 'unknown';
                let cmd = 'unknown';
                try {
                    const req = JSON.parse(data.toString());
                    reqId = req.requestId || 'unknown';
                    cmd = req.command || 'unknown';
                    // Enforce protocol version check
                    if (req.version !== CURRENT_IPC_VERSION) {
                        const errResponse = {
                            version: CURRENT_IPC_VERSION,
                            requestId: reqId,
                            command: cmd,
                            error: `Incompatible protocol version. Expected "${CURRENT_IPC_VERSION}", received "${req.version}"`
                        };
                        socket.write(JSON.stringify(errResponse));
                        return;
                    }
                    let result = null;
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
                                state: e.getState ? e.getState() : 'UNKNOWN',
                                pid: e.getPid ? e.getPid() : undefined,
                                uptimeMs: e.getUptimeMs ? e.getUptimeMs() : undefined,
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
                                    state: targetEngine.getState ? targetEngine.getState() : 'UNKNOWN',
                                    pid: targetEngine.getPid ? targetEngine.getPid() : undefined,
                                    uptimeMs: targetEngine.getUptimeMs ? targetEngine.getUptimeMs() : undefined,
                                    restartCount: targetEngine.getRestartCount ? targetEngine.getRestartCount() : 0,
                                    startedAt: targetEngine.getStartedAt ? targetEngine.getStartedAt() : undefined,
                                }
                            };
                            break;
                        case 'node:register': {
                            if (!req.payload || !req.payload.nodeId || !req.payload.host || !req.payload.port) {
                                throw new Error('Missing nodeId, host, or port in payload');
                            }
                            const disc = serviceRegistry.get('distributed-intelligence:discovery');
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
                            const disc = serviceRegistry.get('distributed-intelligence:discovery');
                            if (!disc) {
                                throw new Error('DiscoveryService is not loaded in serviceRegistry');
                            }
                            if (disc.removeNode) {
                                await disc.removeNode(req.payload.nodeId);
                            }
                            else {
                                disc.localPeers?.delete(req.payload.nodeId);
                            }
                            result = { success: true, message: `Node "${req.payload.nodeId}" unregistered successfully.` };
                            break;
                        }
                        case 'node:list': {
                            const disc = serviceRegistry.get('distributed-intelligence:discovery');
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
                            const engine = serviceRegistry.get('distributed-intelligence');
                            if (!engine) {
                                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
                            }
                            await engine.requestConnection(req.payload.nodeId);
                            result = { success: true, message: `Connection request sent to "${req.payload.nodeId}".` };
                            break;
                        }
                        case 'node:requests': {
                            const engine = serviceRegistry.get('distributed-intelligence');
                            if (!engine) {
                                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
                            }
                            const requests = await engine.getConnectionRequests();
                            result = { success: true, requests };
                            break;
                        }
                        case 'node:clear-requests': {
                            const engine = serviceRegistry.get('distributed-intelligence');
                            if (!engine) {
                                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
                            }
                            await engine.clearConnectionRequests();
                            result = { success: true, message: 'All connection requests cleared successfully.' };
                            break;
                        }
                        case 'node:send-message': {
                            if (!req.payload || !req.payload.nodeId || !req.payload.message) {
                                throw new Error('Missing nodeId or message in payload');
                            }
                            const engine = serviceRegistry.get('distributed-intelligence');
                            if (!engine) {
                                throw new Error('DistributedIntelligenceEngine is not loaded in serviceRegistry');
                            }
                            await engine.messagingService.sendMessage(req.payload.nodeId, 'user_chat_msg', {
                                text: req.payload.message
                            });
                            result = { success: true, message: `Message successfully sent to "${req.payload.nodeId}".` };
                            break;
                        }
                        case 'node:accept': {
                            if (!req.payload || !req.payload.requestId) {
                                throw new Error('Missing requestId in payload');
                            }
                            const engine = serviceRegistry.get('distributed-intelligence');
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
                    const response = {
                        version: CURRENT_IPC_VERSION,
                        requestId: reqId,
                        command: cmd,
                        result
                    };
                    socket.write(JSON.stringify(response));
                }
                catch (err) {
                    const response = {
                        version: CURRENT_IPC_VERSION,
                        requestId: reqId,
                        command: cmd,
                        error: err.message || String(err)
                    };
                    socket.write(JSON.stringify(response));
                }
                finally {
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
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
