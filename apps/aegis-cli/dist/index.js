#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { PackageManager } from '@aegis/package-manager';
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
const repoRoot = getRepositoryRoot();
const configPath = path.resolve(repoRoot, 'config/runtime.json');
const enginesDir = path.resolve(repoRoot, 'engines');
const pkgManager = new PackageManager(configPath, enginesDir);
const program = new Command();
program
    .name('aegis')
    .description('AEGIS Core Platform Command-Line Interface')
    .version('1.0.0');
// PING helper
function pingRuntime(port = 3005) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 1000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}
// 1. RUNTIME COMMANDS
const runtime = program.command('runtime').description('Manage the AEGIS Core Runtime');
runtime
    .command('start')
    .description('Start the runtime service')
    .action(async () => {
    const isRunning = await pingRuntime();
    if (isRunning) {
        console.log('[CLI] Runtime daemon is already running.');
        return;
    }
    console.log('[CLI] Launching Bootloader...');
    // Spawns apps/aegis-boot in background/detached
    const bootScript = path.resolve(repoRoot, 'apps/aegis-boot/dist/index.js');
    const isDev = fs.existsSync(path.resolve(repoRoot, 'apps/aegis-boot/src/index.ts'));
    let exec = 'node';
    let args = [bootScript];
    if (isDev) {
        exec = 'npx';
        args = ['tsx', path.resolve(repoRoot, 'apps/aegis-boot/src/index.ts')];
    }
    const child = spawn(exec, args, { stdio: 'inherit', cwd: repoRoot, shell: true });
    child.on('exit', (code) => {
        if (code === 0) {
            console.log('[CLI] Runtime daemon successfully initialized and active.');
        }
        else {
            console.error(`[CLI] Bootloader failed with exit code: ${code}`);
        }
    });
});
runtime
    .command('stop')
    .description('Stop the runtime service')
    .action(async () => {
    const isRunning = await pingRuntime();
    if (!isRunning) {
        console.log('[CLI] Runtime daemon is not running.');
        return;
    }
    console.log('[CLI] Requesting runtime shutdown daemon endpoint...');
    const req = http.request({
        hostname: 'localhost',
        port: 3005,
        path: '/api/shutdown',
        method: 'POST'
    }, (res) => {
        if (res.statusCode === 200) {
            console.log('[CLI] Shutdown request acknowledged. Daemon terminated.');
        }
        else {
            console.error(`[CLI] Shutdown endpoint returned code: ${res.statusCode}`);
        }
    });
    req.on('error', (err) => {
        console.error('[CLI] Failed to connect to shutdown endpoint:', err.message);
    });
    req.end();
});
runtime
    .command('status')
    .description('Get runtime status')
    .action(async () => {
    const isRunning = await pingRuntime();
    if (isRunning) {
        console.log('AEGIS Runtime Service Status: ACTIVE (Healthy)');
    }
    else {
        console.log('AEGIS Runtime Service Status: INACTIVE (Stopped)');
    }
});
// 2. ENGINE COMMANDS
const engine = program.command('engine').description('Manage installed pluggable engines');
engine
    .command('list')
    .description('List installed engines')
    .action(async () => {
    const list = await pkgManager.listPackages();
    if (list.length === 0) {
        console.log('No pluggable engines installed.');
        return;
    }
    console.log('Installed Pluggable Engines:');
    for (const item of list) {
        console.log(`- ${item.id} (v${item.version}) [Target API: ${item.runtimeApiVersion}]`);
    }
});
engine
    .command('install <packagePath>')
    .description('Install a pluggable engine package')
    .action(async (packagePath) => {
    try {
        await pkgManager.installPackage(packagePath);
    }
    catch (err) {
        console.error('[CLI] Installation failed:', err.message || err);
    }
});
engine
    .command('remove <packageId>')
    .description('Remove an installed pluggable engine')
    .action(async (packageId) => {
    try {
        await pkgManager.removePackage(packageId);
    }
    catch (err) {
        console.error('[CLI] Removal failed:', err.message || err);
    }
});
// 3. DIAGNOSTICS & DOCTOR COMMANDS
program
    .command('doctor')
    .description('Run platform verification checks')
    .action(async () => {
    console.log('=== AEGIS Platform Doctor ===');
    // Check config
    const configExists = fs.existsSync(configPath);
    console.log(`[Doctor] Config Path: ${configPath} [${configExists ? 'OK' : 'MISSING'}]`);
    // Check workspace
    const workspaceExists = fs.existsSync(path.resolve(repoRoot, 'workspace'));
    console.log(`[Doctor] Workspace Dir: [${workspaceExists ? 'OK' : 'MISSING'}]`);
    // Check runtime status
    const runtimeActive = await pingRuntime();
    console.log(`[Doctor] Background Runtime: [${runtimeActive ? 'ACTIVE' : 'INACTIVE'}]`);
    // Check installed engines
    const engines = await pkgManager.listPackages();
    console.log(`[Doctor] Installed Engines: ${engines.length} registered.`);
    console.log('==============================');
});
program.parse(process.argv);
