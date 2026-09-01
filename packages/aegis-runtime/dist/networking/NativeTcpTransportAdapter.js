export class NativeTcpTransportAdapter {
    ipcManagerProvider;
    transportType = 'native_tcp';
    connectionCallbacks = new Set();
    messageCallbacks = new Set();
    disconnectCallbacks = new Set();
    errorCallbacks = new Set();
    constructor(ipcManagerProvider) {
        this.ipcManagerProvider = ipcManagerProvider;
    }
    async listen(port, host = '0.0.0.0') {
        const ipc = this.ipcManagerProvider();
        if (!ipc)
            throw new Error('Native IPC Manager is not available');
        return port;
    }
    async connect(host, port) {
        return { host, port, type: 'native_handle' };
    }
    async send(socket, payload) {
        const ipc = this.ipcManagerProvider();
        if (!ipc)
            throw new Error('Native IPC Manager is not available');
        await ipc.request(1, { action: 'send_message', targetHost: socket.host, targetPort: socket.port, payload });
    }
    async disconnect(socket) { }
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
    async stop() { }
}
