import { EventEmitter } from 'events';
import { NativeProtocol } from './NativeProtocol.js';
import { MessageType } from './MessageTypes.js';
export class StdioTransport extends EventEmitter {
    childProcess = null;
    stdoutBuffer = '';
    stderrBuffer = '';
    constructor() {
        super();
    }
    setProcess(cp) {
        this.childProcess = cp;
        this.stdoutBuffer = '';
        this.stderrBuffer = '';
        cp.stdout?.on('data', (chunk) => {
            this.stdoutBuffer += chunk.toString();
            const lines = this.stdoutBuffer.split('\n');
            this.stdoutBuffer = lines.pop() ?? '';
            for (const line of lines) {
                const packet = NativeProtocol.parse(line);
                if (packet) {
                    this.emit('packet', packet);
                }
            }
        });
        cp.stderr?.on('data', (chunk) => {
            this.stderrBuffer += chunk.toString();
            const lines = this.stderrBuffer.split('\n');
            this.stderrBuffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    const packet = NativeProtocol.createPacket(MessageType.LOG, {
                        message: trimmed,
                        level: 'ERROR',
                        source: 'stderr'
                    });
                    this.emit('packet', packet);
                }
            }
        });
        cp.on('exit', (code, signal) => {
            this.emit('close', code, signal);
        });
        cp.on('error', (err) => {
            this.emit('error', err);
        });
    }
    async send(packet) {
        if (!this.childProcess || this.childProcess.killed) {
            throw new Error('StdioTransport: Process is not running');
        }
        const data = NativeProtocol.serialize(packet);
        this.childProcess.stdin?.write(data);
    }
    async connect() {
        // Stdio connection is established when the child process is set
    }
    async disconnect() {
        if (this.childProcess && !this.childProcess.killed) {
            this.childProcess.stdin?.end();
        }
    }
}
export class IPCManager extends EventEmitter {
    transport = null;
    pendingRequests = new Map();
    constructor() {
        super();
    }
    setTransport(transport) {
        if (this.transport) {
            this.transport.removeAllListeners();
        }
        this.transport = transport;
        transport.on('packet', (packet) => {
            this.handlePacket(packet);
        });
        transport.on('error', (err) => {
            this.emit('error', err);
        });
        transport.on('close', (code, signal) => {
            this.emit('close', code, signal);
        });
    }
    getTransport() {
        return this.transport;
    }
    async send(type, payload = {}) {
        if (!this.transport) {
            throw new Error('IPCManager: No transport configured');
        }
        const packet = NativeProtocol.createPacket(type, payload);
        await this.transport.send(packet);
    }
    async request(type, payload = {}, timeoutMs = 5000) {
        if (!this.transport) {
            throw new Error('IPCManager: No transport configured');
        }
        const packet = NativeProtocol.createPacket(type, payload);
        const messageId = packet.messageId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(messageId);
                reject(new Error(`IPCManager Request Timeout: messageId ${messageId} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pendingRequests.set(messageId, { resolve, reject, timer });
            this.transport.send(packet).catch((err) => {
                clearTimeout(timer);
                this.pendingRequests.delete(messageId);
                reject(err);
            });
        });
    }
    handlePacket(packet) {
        // 1. Check if this is a response to a pending request
        if (packet.messageType === MessageType.RESPONSE) {
            const correlationId = packet.payload.correlationId || packet.payload.requestMessageId;
            if (correlationId && this.pendingRequests.has(correlationId)) {
                const pending = this.pendingRequests.get(correlationId);
                clearTimeout(pending.timer);
                this.pendingRequests.delete(correlationId);
                if (packet.payload.error) {
                    pending.reject(new Error(packet.payload.error));
                }
                else {
                    pending.resolve(packet.payload.data ?? packet.payload);
                }
                return;
            }
        }
        // 2. Emit messageType events
        this.emit('packet', packet);
        this.emit(packet.messageType.toLowerCase(), packet);
    }
    async shutdown() {
        for (const [id, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timer);
            pending.reject(new Error('IPCManager: Shutdown initiated, cancelling pending request'));
        }
        this.pendingRequests.clear();
        if (this.transport) {
            await this.transport.disconnect();
        }
    }
}
export default IPCManager;
//# sourceMappingURL=IPCManager.js.map