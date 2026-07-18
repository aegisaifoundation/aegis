import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonIpcBridge extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private stdoutBuffer = '';
  private stderrBuffer = '';
  private pendingRequests = new Map<string, {
    resolve: (val: any) => void;
    reject: (err: any) => void;
    timer: NodeJS.Timeout;
  }>();
  private isReady = false;
  private readyResolver: (() => void) | null = null;
  private readyPromise: Promise<void> | null = null;

  constructor(private pythonPath = 'python') {
    super();
  }

  async start(): Promise<void> {
    if (this.childProcess) {
      return;
    }

    const scriptPath = path.resolve(__dirname, '../../python/training_service.py');
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at: ${scriptPath}`);
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolver = resolve;
      
      const timeout = setTimeout(() => {
        if (!this.isReady) {
          this.stop();
          reject(new Error(`Timeout waiting for Python Training Service ready signal`));
        }
      }, 30000);

      try {
        this.childProcess = spawn(this.pythonPath, ['-u', scriptPath]);

        this.childProcess.stdout?.on('data', (chunk: Buffer) => {
          this.stdoutBuffer += chunk.toString();
          const lines = this.stdoutBuffer.split('\n');
          this.stdoutBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed === 'AEGIS_TRAINING_READY') {
              this.isReady = true;
              clearTimeout(timeout);
              this.readyResolver?.();
              this.emit('ready');
              continue;
            }

            try {
              const packet = JSON.parse(trimmed);
              if (packet.messageType === 'EVENT') {
                const eventName = packet.payload?.eventName;
                const data = packet.payload?.data;
                if (eventName) {
                  this.emit('event', eventName, data);
                }
                continue;
              }

              const correlationId = packet.payload?.correlationId;
              if (correlationId && this.pendingRequests.has(correlationId)) {
                const pending = this.pendingRequests.get(correlationId)!;
                clearTimeout(pending.timer);
                this.pendingRequests.delete(correlationId);
                
                if (packet.payload.error) {
                  pending.reject(new Error(packet.payload.error));
                } else {
                  pending.resolve(packet.payload.data);
                }
              }
            } catch (err) {
              this.emit('log', `Failed to parse Python stdout: ${trimmed}`);
              console.log(`[Python Service Output] ${trimmed}`);
            }
          }
        });

        this.childProcess.stderr?.on('data', (chunk: Buffer) => {
          this.stderrBuffer += chunk.toString();
          const lines = this.stderrBuffer.split('\n');
          this.stderrBuffer = lines.pop() ?? '';
          for (const line of lines) {
            this.emit('log', `[Python Service STDERR] ${line.trim()}`);
            console.error(`[Python Service STDERR] ${line.trim()}`);
          }
        });

        this.childProcess.on('exit', (code, signal) => {
          this.childProcess = null;
          this.isReady = false;
          this.rejectAllPending(new Error(`Python training process exited (code=${code}, signal=${signal})`));
          this.emit('exit', code, signal);
        });

        this.childProcess.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });

    await this.readyPromise;
  }

  async request(action: string, data: any, timeoutMs = 60000): Promise<any> {
    if (!this.childProcess || !this.isReady) {
      throw new Error('Python Training Service is not running or not ready');
    }

    const messageId = `msg-${crypto.randomUUID()}`;
    const packet = {
      protocolVersion: '1.0.0',
      messageType: 'REQUEST',
      messageId,
      timestamp: new Date().toISOString(),
      payload: {
        action,
        data
      }
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Python IPC request timeout for action "${action}"`));
      }, timeoutMs);

      this.pendingRequests.set(messageId, { resolve, reject, timer });
      
      try {
        this.childProcess?.stdin?.write(JSON.stringify(packet) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(messageId);
        reject(err);
      }
    });
  }

  stop(): void {
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
    this.isReady = false;
    this.rejectAllPending(new Error('Python Process manager stopped'));
  }

  private rejectAllPending(err: Error) {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pendingRequests.clear();
  }
}

export const pythonIpcBridge = new PythonIpcBridge();
export default pythonIpcBridge;
