import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

function checkRuntimeHealth(port = 3005): Promise<boolean> {
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
  
  console.log('[Bootloader] Daemon not detected. Spawning background runtime daemon...');
  
  const repoRoot = getRepositoryRoot();
  const daemonJsPath = path.resolve(repoRoot, 'packages/aegis-runtime/dist/daemon.js');
  const daemonTsPath = path.resolve(repoRoot, 'packages/aegis-runtime/src/daemon.ts');
  
  const isDev = fs.existsSync(daemonTsPath);
  console.log(`[Bootloader] Spawning daemon in ${isDev ? 'development (TSX)' : 'production (JS)'} mode...`);
  
  const { spawn } = await import('child_process');
  
  const logDir = path.resolve(repoRoot, 'workspace/logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = fs.openSync(path.join(logDir, 'daemon_boot.log'), 'a');

  let child;
  if (isDev) {
    child = spawn('node', [
      '--import', 'tsx',
      '--experimental-specifier-resolution=node',
      '--no-warnings',
      daemonTsPath
    ], {
      detached: true,
      stdio: 'ignore',
      cwd: repoRoot
    });
  } else {
    child = spawn('node', [
      '--experimental-specifier-resolution=node',
      '--no-warnings',
      daemonJsPath
    ], {
      detached: true,
      stdio: 'ignore',
      cwd: repoRoot
    });
  }
  
  child.unref();
  
  console.log('[Bootloader] Waiting for daemon to initialize and become healthy...');
  const hasApiEngine = fs.existsSync(path.resolve(repoRoot, 'workspace/engines/aegis-api'));
  
  let healthy = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (child.exitCode !== null) {
      break;
    }
    
    if (hasApiEngine) {
      healthy = await checkRuntimeHealth();
      if (healthy) {
        break;
      }
    } else {
      // In zero-engine mode, if daemon is still alive after 3 seconds, it is healthy.
      if (i >= 3) {
        healthy = true;
        break;
      }
    }
  }
  
  if (healthy) {
    console.log('[Bootloader] AEGIS Runtime Daemon successfully booted and verified healthy. Exiting bootloader.');
    process.exit(0);
  } else {
    console.error('[Bootloader] Error: AEGIS Runtime Daemon failed to initialize within timeout.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Bootloader] Fatal bootstrap error:', err);
  process.exit(1);
});
