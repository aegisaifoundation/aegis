import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// ============================================================
// Distributed Intelligence Engine — TypeScript Process Adapter
//
// This class implements IEngine and manages the native C++
// die-service binary as a child process. From the Runtime's
// perspective this is identical to any other IEngine.
//
// No Distributed Intelligence logic lives here.
// This class is ONLY responsible for process lifecycle.
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const READY_SIGNAL = 'AEGIS_DIE_READY';
const STOPPED_SIGNAL = 'AEGIS_DIE_STOPPED';
const STARTUP_TIMEOUT_MS = 15_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const RESTART_DELAY_MS = 2_000;
const MAX_RESTARTS = 3;
export class DistributedIntelligenceEngine {
    metadata = {
        id: 'distributed-intelligence',
        displayName: 'Distributed Intelligence Engine',
        version: '1.0.0',
        kernelApiVersion: '1.0.0',
        dependencies: [],
        priority: 5,
        autoStart: true,
        singleton: true,
        permissions: ['process:spawn', 'network:tcp', 'fs:read'],
    };
    context;
    process = null;
    state = 'REGISTERED';
    restartCount = 0;
    startedAt = null;
    executablePath = '';
    // ——————————————————————————————————————————
    // IEngine Lifecycle
    // ——————————————————————————————————————————
    async initialize(context) {
        this.context = context;
        this.executablePath = this.resolveExecutable();
        context.getLogger().info(`[DistributedIntelligenceEngine] Initialized. Executable: ${this.executablePath}`, 'distributed-intelligence');
    }
    async configure(_config) { }
    async start() {
        if (this.state === 'ONLINE') {
            this.log('info', 'Engine is already ONLINE.');
            return;
        }
        this.setState('STARTING');
        await this.launchProcess();
    }
    async pause() { }
    async resume() { }
    async health() {
        const t0 = Date.now();
        if (this.state === 'ONLINE' && this.process && !this.process.killed && this.process.pid) {
            return { status: 'HEALTHY', latencyMs: Date.now() - t0, details: { pid: this.process.pid, state: this.state } };
        }
        if (this.state === 'STARTING' || this.state === 'RESTARTING') {
            return { status: 'DEGRADED', latencyMs: Date.now() - t0, message: `Engine is ${this.state}`, details: { state: this.state } };
        }
        return { status: 'UNHEALTHY', latencyMs: Date.now() - t0, message: `Engine state is ${this.state}`, details: { state: this.state } };
    }
    async reload() {
        this.log('info', 'Reload requested — performing stop → start cycle.');
        await this.shutdown();
        await this.start();
    }
    async shutdown() {
        if (this.state === 'STOPPED' || this.state === 'REGISTERED')
            return;
        this.setState('STOPPING');
        await this.terminateProcess();
        this.setState('STOPPED');
    }
    async dispose() {
        await this.shutdown();
    }
    // ——————————————————————————————————————————
    // Public Getters (for IPC engineInfo)
    // ——————————————————————————————————————————
    getState() { return this.state; }
    getPid() { return this.process?.pid; }
    getStartedAt() { return this.startedAt; }
    getUptimeMs() {
        return this.startedAt ? Date.now() - this.startedAt.getTime() : 0;
    }
    getRestartCount() { return this.restartCount; }
    // ——————————————————————————————————————————
    // Internal — Process Launch
    // ——————————————————————————————————————————
    launchProcess() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.executablePath)) {
                const err = new Error(`[DistributedIntelligenceEngine] Executable not found: ${this.executablePath}. Run "npm run build" inside packages/aegis-distributed-intelligence.`);
                this.setState('FAILED');
                return reject(err);
            }
            this.log('info', `Launching native executable: ${this.executablePath}`);
            const child = spawn(this.executablePath, ['--node-name', 'aegis-die-node', '--port', '9900'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true,
            });
            this.process = child;
            let settled = false;
            const timeoutHandle = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    this.setState('FAILED');
                    child.kill();
                    reject(new Error('[DistributedIntelligenceEngine] Startup timed out waiting for AEGIS_DIE_READY.'));
                }
            }, STARTUP_TIMEOUT_MS);
            // Read stdout line-by-line
            let stdoutBuffer = '';
            child.stdout?.on('data', (chunk) => {
                stdoutBuffer += chunk.toString();
                const lines = stdoutBuffer.split('\n');
                stdoutBuffer = lines.pop() ?? '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed)
                        continue;
                    if (trimmed === READY_SIGNAL) {
                        if (!settled) {
                            settled = true;
                            clearTimeout(timeoutHandle);
                            this.setState('ONLINE');
                            this.startedAt = new Date();
                            this.log('info', 'Engine reported READY. Marked HEALTHY.');
                            this.context.getEventBus()?.emit('engine:ready', { engineId: this.metadata.id });
                            resolve();
                        }
                    }
                    else if (trimmed === STOPPED_SIGNAL) {
                        this.log('info', 'Engine reported STOPPED.');
                    }
                    else {
                        // Forward all other DIE stdout lines to the Runtime logger
                        this.log('info', `[Distributed Intelligence] ${trimmed}`);
                    }
                }
            });
            child.stderr?.on('data', (chunk) => {
                const msg = chunk.toString().trim();
                if (msg)
                    this.log('error', `[Distributed Intelligence] STDERR: ${msg}`);
            });
            child.on('exit', (code, signal) => {
                const wasOnline = this.state === 'ONLINE';
                this.process = null;
                if (!settled) {
                    settled = true;
                    clearTimeout(timeoutHandle);
                    this.setState('FAILED');
                    reject(new Error(`[DistributedIntelligenceEngine] Process exited before READY (code=${code}, signal=${signal})`));
                    return;
                }
                if (this.state === 'STOPPING') {
                    // Expected shutdown — already handled by terminateProcess
                    return;
                }
                // Unexpected crash
                if (wasOnline) {
                    this.log('error', `Crash detected (code=${code}, signal=${signal}).`);
                    this.setState('FAILED');
                    this.context.getEventBus()?.emit('engine:crashed', { engineId: this.metadata.id, code, signal });
                    this.scheduleRestart();
                }
            });
            child.on('error', (err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeoutHandle);
                    this.setState('FAILED');
                    reject(err);
                }
            });
        });
    }
    // ——————————————————————————————————————————
    // Internal — Process Termination
    // ——————————————————————————————————————————
    terminateProcess() {
        return new Promise((resolve) => {
            const child = this.process;
            if (!child || child.killed) {
                this.process = null;
                return resolve();
            }
            this.log('info', `Sending SIGTERM to PID ${child.pid}...`);
            const timeout = setTimeout(() => {
                this.log('warn', 'Graceful shutdown timed out. Force-killing process.');
                child.kill('SIGKILL');
                this.process = null;
                resolve();
            }, SHUTDOWN_TIMEOUT_MS);
            child.once('exit', () => {
                clearTimeout(timeout);
                this.process = null;
                resolve();
            });
            // On Windows, write SHUTDOWN to stdin (die-service reads it)
            try {
                child.stdin?.write('SHUTDOWN\n');
                child.stdin?.end();
            }
            catch { }
            // Also send SIGTERM on POSIX
            if (process.platform !== 'win32') {
                child.kill('SIGTERM');
            }
        });
    }
    // ——————————————————————————————————————————
    // Internal — Crash Recovery
    // ——————————————————————————————————————————
    scheduleRestart() {
        if (this.restartCount >= MAX_RESTARTS) {
            this.log('error', `Max restart attempts (${MAX_RESTARTS}) reached. Engine remains FAILED.`);
            return;
        }
        this.restartCount++;
        this.setState('RESTARTING');
        this.log('warn', `Scheduling restart attempt ${this.restartCount}/${MAX_RESTARTS} in ${RESTART_DELAY_MS}ms...`);
        setTimeout(async () => {
            try {
                await this.launchProcess();
                this.log('info', `Restart attempt ${this.restartCount} succeeded.`);
                this.context.getEventBus()?.emit('engine:restarted', { engineId: this.metadata.id, attempt: this.restartCount });
            }
            catch (err) {
                this.log('error', `Restart attempt ${this.restartCount} failed: ${err.message}`);
                this.scheduleRestart();
            }
        }, RESTART_DELAY_MS);
    }
    // ——————————————————————————————————————————
    // Internal — Helpers
    // ——————————————————————————————————————————
    resolveExecutable() {
        // Walk up from this file's location to find the package root
        let dir = __dirname;
        while (dir !== path.dirname(dir)) {
            const pkg = path.join(dir, 'package.json');
            if (fs.existsSync(pkg)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(pkg, 'utf8'));
                    if (parsed.name === '@aegis/distributed-intelligence') {
                        const exe = process.platform === 'win32' ? 'die-service.exe' : 'die-service';
                        return path.join(dir, 'dist', exe);
                    }
                }
                catch { }
            }
            dir = path.dirname(dir);
        }
        // Fallback: relative to dist/index.js
        const exe = process.platform === 'win32' ? 'die-service.exe' : 'die-service';
        return path.resolve(__dirname, '..', 'dist', exe);
    }
    setState(state) {
        this.state = state;
        this.log('info', `State → ${state}`);
    }
    log(level, msg) {
        const logger = this.context?.getLogger();
        if (logger) {
            logger[level](msg, 'distributed-intelligence');
        }
        else {
            console[level](`[DistributedIntelligenceEngine] ${msg}`);
        }
    }
}
//# sourceMappingURL=DistributedIntelligenceEngine.js.map