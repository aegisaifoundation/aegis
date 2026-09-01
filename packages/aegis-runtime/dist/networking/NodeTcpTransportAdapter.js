import net from 'net';
export class NodeTcpTransportAdapter {
    transportType = 'tcp';
    server = null;
    connectionCallbacks = new Set();
    messageCallbacks = new Set();
    disconnectCallbacks = new Set();
    errorCallbacks = new Set();
    async listen(port, host = '0.0.0.0') {
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
                        }
                        else {
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
            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE' && port !== 0) {
                    console.warn(`[AEGIS Transport] Port ${port} occupied. Retrying with OS dynamic port allocation (port 0)...`);
                    this.server?.listen(0, host, () => {
                        const address = this.server?.address();
                        const actualPort = typeof address === 'object' && address ? address.port : 0;
                        console.log(`[AEGIS Transport] NodeTcpTransportAdapter bound to OS dynamic port ${host}:${actualPort}`);
                        resolve(actualPort);
                    });
                }
                else {
                    reject(err);
                }
            });
        });
    }
    async connect(host, port) {
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
                        }
                        else {
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
    async send(socket, payload) {
        return new Promise((resolve, reject) => {
            if (!socket || socket.destroyed || !socket.writable) {
                return reject(new Error('Socket is not writable'));
            }
            const buf = Buffer.from(payload, 'utf8');
            const lenBuf = Buffer.alloc(4);
            lenBuf.writeUInt32BE(buf.length, 0);
            socket.write(Buffer.concat([lenBuf, buf]), (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async disconnect(socket) {
        if (socket && !socket.destroyed) {
            socket.destroy();
        }
    }
    onConnection(callback) {
        this.connectionCallbacks.add(callback);
    }
    onMessage(callback) {
        this.messageCallbacks.add(callback);
    }
    onDisconnect(callback) {
        this.disconnectCallbacks.add(callback);
    }
    onError(callback) {
        this.errorCallbacks.add(callback);
    }
    async stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
