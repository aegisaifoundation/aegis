import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getRepositoryRoot() {
    let current = __dirname;
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
function checkRuntimeHealth(port = 3005) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 1000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => {
            resolve(false);
        });
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}
async function main() {
    console.log('[Bootloader] Checking for running AEGIS runtime daemon...');
    const isRunning = await checkRuntimeHealth();
    if (isRunning) {
        console.log('[Bootloader] AEGIS Runtime Daemon is already running. Exiting.');
        process.exit(0);
    }
    console.log('[Bootloader] Daemon not detected. Running AEGIS Core Runtime inline...');
    const repoRoot = getRepositoryRoot();
    // Import and run the daemon inline — no child process spawn.
    // This keeps the daemon alive as long as the parent (python launcher) is alive.
    const daemonPath = path.resolve(repoRoot, 'packages/aegis-runtime/src/boot/Bootloader.js');
    const daemonTsPath = path.resolve(repoRoot, 'packages/aegis-runtime/src/boot/Bootloader.ts');
    try {
        // Dynamic import of the Bootloader — tsx handles .ts resolution
        const { Bootloader } = await import(fs.existsSync(daemonTsPath)
            ? `file:///${daemonTsPath.replace(/\\/g, '/')}`
            : `file:///${daemonPath.replace(/\\/g, '/')}`);
        console.log('[Bootloader] Starting AEGIS Runtime Kernel inline...');
        const kernelApi = await Bootloader.boot();
        console.log('[Bootloader] AEGIS Runtime Kernel is ACTIVE inline.');
        // Keep the process alive indefinitely — the kernel runs HTTP servers internally
        // The parent process (python launcher) manages the lifecycle
        process.on('SIGINT', async () => {
            console.log('[Bootloader] Received SIGINT. Shutting down...');
            try {
                await kernelApi.shutdown();
            }
            catch { }
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('[Bootloader] Received SIGTERM. Shutting down...');
            try {
                await kernelApi.shutdown();
            }
            catch { }
            process.exit(0);
        });
    }
    catch (err) {
        console.error('[Bootloader] Fatal error during inline daemon startup:', err);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('[Bootloader] Fatal bootstrap error:', err);
    process.exit(1);
});
