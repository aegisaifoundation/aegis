import net from 'net';
import fs from 'fs';
import { getIpcPath } from './IpcPath.js';
import { CURRENT_IPC_VERSION } from './IpcProtocol.js';
import { engineManager } from '../managers/EngineManager.js';
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
                                version: e.metadata.version
                            }));
                            result = { success: true, engines };
                            break;
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
