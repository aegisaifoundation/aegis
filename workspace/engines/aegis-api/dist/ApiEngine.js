import fs from 'fs';
import path from 'path';
export class ApiEngine {
    metadata = {
        id: "aegis-api",
        displayName: "REST API Connector Engine",
        version: "1.0.0",
        kernelApiVersion: "1.0.0",
        dependencies: [],
        priority: 20,
        autoStart: true,
        singleton: true,
        permissions: ["net:listen", "fs:read"]
    };
    context;
    serverActive = false;
    getRepositoryRoot(startDir) {
        let current = path.resolve(startDir);
        const seen = new Set();
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-monorepo') {
                        return current;
                    }
                }
                catch (e) { }
            }
            const parent = path.dirname(current);
            if (parent === current || seen.has(parent)) {
                break;
            }
            seen.add(current);
            current = parent;
        }
        return process.cwd();
    }
    async initialize(context) {
        this.context = context;
        context.getLogger().info('ApiEngine initialized successfully.', 'api');
    }
    async configure(config) { }
    async start() {
        this.context.getLogger().info('Starting REST API Server...', 'api');
        try {
            const { startApiServer } = await import('./ApiServer.js');
            await startApiServer();
            this.serverActive = true;
            this.context.getLogger().info('[ApiEngine] REST API Server successfully started.', 'api');
        }
        catch (err) {
            this.context.getLogger().error(`[ApiEngine] Failed to start REST API Server: ${err.message}`, 'api');
            throw err;
        }
    }
    async pause() { }
    async resume() { }
    async health() {
        return {
            status: this.serverActive ? 'HEALTHY' : 'DEGRADED',
            latencyMs: 0
        };
    }
    async reload() { }
    async shutdown() {
        this.context.getLogger().info('[ApiEngine] Shutting down REST API Server.', 'api');
    }
    async dispose() { }
}
