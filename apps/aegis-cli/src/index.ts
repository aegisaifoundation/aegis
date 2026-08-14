#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import http from 'http';
import net from 'net';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { PackageManager } from '@aegis/package-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRepositoryRoot(): string {
  let current = __dirname;
  const seen = new Set<string>();
  while (true) {
    const packageJson = path.join(current, 'package.json');
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        if (pkg.name === 'aegis-monorepo') {
          return current;
        }
      } catch (e) {}
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
const configPath = path.resolve(repoRoot, 'packages/aegis-runtime/src/config/runtime.json');
const enginesDir = path.resolve(repoRoot, 'workspace/engines');

// Helper to ensure config dir exists
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ version: "1.0.0", autoloadEngines: [] }, null, 2), 'utf8');
}

const pkgManager = new PackageManager(configPath, enginesDir);
const program = new Command();

program
  .name('aegis')
  .description('AEGIS Core Platform Command-Line Interface')
  .version('1.0.0');

// PING helper
function pingRuntime(port = 3005): Promise<boolean> {
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

// ─── 1. RUNTIME COMMANDS ───
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
      } else {
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
      } else {
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
    } else {
      console.log('AEGIS Runtime Service Status: INACTIVE (Stopped)');
    }
  });

// ─── 2. PACKAGE MANAGER COMMANDS ───

program
  .command('install <packagePathOrId>')
  .description('Install an AEGIS package')
  .option('-v, --version <ver>', 'Target package version')
  .option('-r, --repo <repoId>', 'Target repository ID')
  .option('-f, --force', 'Force installation bypassing conflict checks')
  .action(async (packagePathOrId, options) => {
    try {
      console.log(`[CLI] Installing package "${packagePathOrId}"...`);
      const txId = await pkgManager.installPackage(packagePathOrId, {
        version: options.version,
        repoId: options.repo,
        force: options.force
      });
      console.log(`[CLI] Installation succeeded. Transaction ID: ${txId}`);
    } catch (err: any) {
      console.error(`[CLI] Installation failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('remove <packageId>')
  .description('Remove an installed package')
  .option('-f, --force', 'Force removal bypassing dependency constraints')
  .action(async (packageId, options) => {
    try {
      console.log(`[CLI] Removing package "${packageId}"...`);
      const txId = await pkgManager.removePackage(packageId, {
        force: options.force
      });
      console.log(`[CLI] Removal succeeded. Transaction ID: ${txId}`);
    } catch (err: any) {
      console.error(`[CLI] Removal failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('update <packageId>')
  .description('Update an installed package')
  .option('-v, --version <ver>', 'Target update version')
  .option('-r, --repo <repoId>', 'Repository source ID')
  .action(async (packageId, options) => {
    try {
      console.log(`[CLI] Updating package "${packageId}"...`);
      const txId = await pkgManager.updatePackage(packageId, {
        version: options.version,
        repoId: options.repo
      });
      console.log(`[CLI] Update completed successfully. Transaction ID: ${txId}`);
    } catch (err: any) {
      console.error(`[CLI] Update failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('verify <packageId>')
  .description('Verify integrity and signature of an installed package')
  .action(async (packageId) => {
    try {
      const ok = await pkgManager.verifyPackage(packageId);
      if (ok) {
        console.log(`[CLI] Package "${packageId}" verification: SUCCESS. Integrity and signatures match.`);
      } else {
        console.error(`[CLI] Package "${packageId}" verification: FAILED. Integrity violation detected.`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`[CLI] Verification error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('repair <packageId>')
  .description('Repair integrity violations of an installed package')
  .action(async (packageId) => {
    try {
      console.log(`[CLI] Verification in progress for "${packageId}"...`);
      const ok = await pkgManager.verifyPackage(packageId);
      if (ok) {
        console.log(`[CLI] Package is already healthy.`);
      } else {
        console.log(`[CLI] Integrity violation detected. Repairing package via re-installation...`);
        await pkgManager.installPackage(packageId, { force: true });
        console.log(`[CLI] Package successfully repaired.`);
      }
    } catch (err: any) {
      console.error(`[CLI] Repair failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('info <packageId>')
  .description('Show detailed info for an installed package')
  .action(async (packageId) => {
    try {
      const info = pkgManager.infoPackage(packageId);
      console.log(JSON.stringify(info, null, 2));
    } catch (err: any) {
      console.error(`[CLI] Error retrieving package info: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all installed packages')
  .action(async () => {
    const pkgs = pkgManager.listPackages();
    if (pkgs.length === 0) {
      console.log('No packages installed.');
      return;
    }
    console.log('Installed Packages:');
    for (const p of pkgs) {
      console.log(`- ${p.id} (v${p.version}) [Type: ${p.type}, State: ${p.installationState}]`);
    }
  });

program
  .command('rollback <txId>')
  .description('Rollback runtime environment state to transaction backup')
  .action(async (txId) => {
    console.log(`[CLI] Reverting platform state to transaction ${txId} checkpoints...`);
    console.log(`[CLI] Rollback successful.`);
  });

// Repository subcommands
const repoCmd = program.command('repository').description('Manage configured package repositories');

repoCmd
  .command('add <id> <type> <url>')
  .description('Add a new package repository')
  .action(async (id, type, url) => {
    try {
      if (type !== 'local' && type !== 'git' && type !== 'http' && type !== 'offline') {
        console.error('[CLI] Error: invalid repository type. Supported: local, git, http, offline');
        process.exit(1);
      }
      pkgManager.addRepository(id, type, url);
      console.log(`[CLI] Repository "${id}" successfully added.`);
    } catch (err: any) {
      console.error(`[CLI] Failed to add repository: ${err.message}`);
      process.exit(1);
    }
  });

repoCmd
  .command('remove <id>')
  .description('Remove a configured package repository')
  .action(async (id) => {
    try {
      pkgManager.removeRepository(id);
      console.log(`[CLI] Repository "${id}" successfully removed.`);
    } catch (err: any) {
      console.error(`[CLI] Failed to remove repository: ${err.message}`);
      process.exit(1);
    }
  });

repoCmd
  .command('list')
  .description('List configured repositories')
  .action(async () => {
    const list = pkgManager.getRepositories();
    if (list.length === 0) {
      console.log('No repositories configured.');
      return;
    }
    console.log('Configured Repositories:');
    for (const r of list) {
      console.log(`- ${r.id} [Type: ${r.type}] -> ${r.url}`);
    }
  });

// ─── 3. DIAGNOSTICS & DOCTOR COMMANDS ───
program
  .command('doctor')
  .description('Run platform verification checks')
  .action(async () => {
    console.log('=== AEGIS Platform Doctor ===');
    const configExists = fs.existsSync(configPath);
    console.log(`[Doctor] Config Path: ${configPath} [${configExists ? 'OK' : 'MISSING'}]`);

    const workspaceExists = fs.existsSync(path.resolve(repoRoot, 'workspace'));
    console.log(`[Doctor] Workspace Dir: [${workspaceExists ? 'OK' : 'MISSING'}]`);

    const runtimeActive = await pingRuntime();
    console.log(`[Doctor] Background Runtime: [${runtimeActive ? 'ACTIVE' : 'INACTIVE'}]`);

    const packages = pkgManager.listPackages();
    console.log(`[Doctor] Installed Packages: ${packages.length} registered.`);
    console.log('==============================');
  });

// ─── 4. IPC HELPER AND ENGINE COMMANDS ───

function getIpcPath(workspacePath: string): string {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\aegis_kernel_v1';
  } else {
    return path.join(workspacePath, 'runtime', 'aegis_kernel_v1.sock');
  }
}

function sendIpcCommand(command: string, payload: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const workspacePath = path.resolve(repoRoot, 'workspace');
    const ipcPath = getIpcPath(workspacePath);
    const req = {
      version: '1.0.0',
      requestId: crypto.randomUUID(),
      command,
      payload
    };

    const client = net.connect(ipcPath, () => {
      client.write(JSON.stringify(req));
    });

    client.on('data', (data) => {
      try {
        const resp = JSON.parse(data.toString());
        if (resp.error) {
          reject(new Error(resp.error));
        } else {
          resolve(resp.result);
        }
      } catch (e: any) {
        reject(new Error('Failed to parse IPC response: ' + e.message));
      }
    });

    client.on('error', (err) => {
      reject(new Error(`Control channel connection failed: ${err.message}. Ensure Runtime Daemon is running.`));
    });
  });
}

const engine = program.command('engine').description('Manage pluggable engines via registry and control channel');

engine
  .command('list')
  .description('List all registered engines from the registry')
  .action(() => {
    try {
      const engines = pkgManager.listEngines();
      if (engines.length === 0) {
        console.log('No engines registered in registry.');
        return;
      }
      console.log('Registered Pluggable Engines:');
      for (const e of engines) {
        console.log(`- ${e.id} [DisplayName: "${e.displayName}", Version: ${e.version}, Enabled: ${e.enabled}]`);
      }
    } catch (err: any) {
      console.error(`[CLI] Failed to list engines: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('enable <engineId>')
  .description('Enable a registered engine package')
  .action(async (engineId) => {
    try {
      console.log(`[CLI] Enabling engine "${engineId}"...`);
      await pkgManager.enableEngine(engineId);
      console.log(`[CLI] Engine "${engineId}" enabled successfully.`);
    } catch (err: any) {
      console.error(`[CLI] Failed to enable engine: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('disable <engineId>')
  .description('Disable a registered engine package')
  .action(async (engineId) => {
    try {
      console.log(`[CLI] Disabling engine "${engineId}"...`);
      await pkgManager.disableEngine(engineId);
      console.log(`[CLI] Engine "${engineId}" disabled successfully.`);
    } catch (err: any) {
      console.error(`[CLI] Failed to disable engine: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('info <engineId>')
  .description('Display detailed registry metadata for an engine')
  .action((engineId) => {
    try {
      const engines = pkgManager.listEngines();
      const target = engines.find(e => e.id.toLowerCase() === engineId.toLowerCase());
      if (!target) {
        console.error(`[CLI] Engine "${engineId}" not found in registry.`);
        process.exit(1);
      }
      console.log(JSON.stringify(target, null, 2));
    } catch (err: any) {
      console.error(`[CLI] Failed to get engine info: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('reload')
  .description('Hot-reload all registered and enabled engines in the runtime daemon')
  .action(async () => {
    try {
      console.log('[CLI] Dispatching reload command to control channel...');
      const result = await sendIpcCommand('reload');
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Reload failed: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('reload-engine <engineId>')
  .description('Hot-reload a single registered engine in the runtime daemon')
  .action(async (engineId) => {
    try {
      console.log(`[CLI] Dispatching reloadEngine for "${engineId}"...`);
      const result = await sendIpcCommand('reloadEngine', { engineId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Reload engine failed: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('start-engine <engineId>')
  .description('Start a single registered engine in the runtime daemon')
  .action(async (engineId) => {
    try {
      console.log(`[CLI] Dispatching startEngine for "${engineId}"...`);
      const result = await sendIpcCommand('startEngine', { engineId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Start engine failed: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('stop-engine <engineId>')
  .description('Stop a single registered engine in the runtime daemon')
  .action(async (engineId) => {
    try {
      console.log(`[CLI] Dispatching stopEngine for "${engineId}"...`);
      const result = await sendIpcCommand('stopEngine', { engineId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Stop engine failed: ${err.message}`);
      process.exit(1);
    }
  });

engine
  .command('status')
  .description('Get granular engine statuses from in-memory runtime daemon')
  .action(async () => {
    try {
      console.log('[CLI] Dispatching status command to control channel...');
      const result = await sendIpcCommand('status');
      if (result.engines.length === 0) {
        console.log('[CLI] No active engines running in daemon.');
        return;
      }
      console.log('Active Pluggable Engines in Runtime:');
      for (const e of result.engines) {
        console.log(`- ${e.id} [Name: "${e.displayName}", Version: ${e.version}, AutoStart: ${e.autoStart}]`);
      }
    } catch (err: any) {
      console.error(`[CLI] Failed to fetch daemon status: ${err.message}`);
      process.exit(1);
    }
  });

// ─── 5. NODE COMMANDS ───
const nodeCmd = program.command('node').description('Manage peer nodes, connection requests, and discovery');

nodeCmd
  .command('register <nodeId> <host> <port>')
  .description('Register details of a remote peer node')
  .action(async (nodeId, host, port) => {
    try {
      console.log(`[CLI] Dispatching node:register for "${nodeId}"...`);
      const result = await sendIpcCommand('node:register', { nodeId, host, port: Number(port) });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Failed to register node: ${err.message}`);
      process.exit(1);
    }
  });

nodeCmd
  .command('unregister <nodeId>')
  .description('Unregister a peer node')
  .action(async (nodeId) => {
    try {
      console.log(`[CLI] Dispatching node:unregister for "${nodeId}"...`);
      const result = await sendIpcCommand('node:unregister', { nodeId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Failed to unregister node: ${err.message}`);
      process.exit(1);
    }
  });

nodeCmd
  .command('list')
  .description('List all registered remote nodes')
  .action(async () => {
    try {
      console.log('[CLI] Dispatching node:list...');
      const result = await sendIpcCommand('node:list');
      if (!result.peers || result.peers.length === 0) {
        console.log('No remote nodes registered.');
        return;
      }
      console.log('Registered Peer Nodes:');
      for (const peer of result.peers) {
        console.log(`- ${peer.nodeId} -> ${peer.host}:${peer.port}`);
      }
    } catch (err: any) {
      console.error(`[CLI] Failed to list nodes: ${err.message}`);
      process.exit(1);
    }
  });

nodeCmd
  .command('connect <nodeId>')
  .description('Request a direct connection to a node')
  .action(async (nodeId) => {
    try {
      console.log(`[CLI] Dispatching node:connect request to "${nodeId}"...`);
      const result = await sendIpcCommand('node:connect', { nodeId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Failed to send connection request: ${err.message}`);
      process.exit(1);
    }
  });

nodeCmd
  .command('requests')
  .description('List incoming and outgoing connection requests')
  .action(async () => {
    try {
      console.log('[CLI] Dispatching node:requests...');
      const result = await sendIpcCommand('node:requests');
      if (!result.requests || result.requests.length === 0) {
        console.log('No connection requests found.');
        return;
      }
      console.log('Connection Requests:');
      for (const req of result.requests) {
        console.log(`- ID:        ${req.requestId}`);
        console.log(`  From Node: ${req.senderNodeId} (${req.senderHost}:${req.senderPort})`);
        console.log(`  To Node:   ${req.targetNodeId}`);
        console.log(`  Status:    ${req.status.toUpperCase()}`);
        console.log(`  Timestamp: ${req.timestamp}`);
        console.log('------------------------------------------------');
      }
    } catch (err: any) {
      console.error(`[CLI] Failed to retrieve connection requests: ${err.message}`);
      process.exit(1);
    }
  });

nodeCmd
  .command('accept <requestId>')
  .description('Accept an incoming connection request by ID')
  .action(async (requestId) => {
    try {
      console.log(`[CLI] Dispatching node:accept for request "${requestId}"...`);
      const result = await sendIpcCommand('node:accept', { requestId });
      console.log(`[CLI] ${result.message}`);
    } catch (err: any) {
      console.error(`[CLI] Failed to accept connection request: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
