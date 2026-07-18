// register-default-engines.mjs — Registers default engines in package database and syncs registry
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PackageManager } from './packages/aegis-package-manager/dist/core/PackageManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const configPath  = path.join(__dirname, 'packages/aegis-runtime/src/config/runtime.json');
const enginesDir  = path.join(__dirname, 'workspace/engines');

const pm = new PackageManager(configPath, enginesDir);

const packages = [
  'aegis-memory',
  'aegis-agent',
  'aegis-api',
  'aegis-federated-learning',
  'aegis-swarm-learning',
  'aegis-distributed-inference',
  'aegis-knowledge-sync',
  'aegis-distributed-learning',
  'aegis-collaboration',
  'aegis-collective-intelligence',
  'aegis-training-engine',
  'aegis-unified-platform'
];

console.log('[register-default-engines] Starting registration of default engines...');

for (const pkg of packages) {
  const pkgDir = path.join(__dirname, 'packages', pkg);
  
  // Create manifest.json from engine.json
  const engineJsonPath = path.join(pkgDir, 'engine.json');
  const manifestPath = path.join(pkgDir, 'manifest.json');
  
  if (fs.existsSync(engineJsonPath)) {
    const engineJson = JSON.parse(fs.readFileSync(engineJsonPath, 'utf8'));
    const manifest = {
      id: engineJson.id,
      name: engineJson.displayName,
      version: engineJson.version,
      type: 'Engine',
      entrypoint: engineJson.entrypoint,
      kernelApiVersion: engineJson.kernelApiVersion,
      sdkVersion: '1.0.0',
      permissions: engineJson.permissions,
      dependencies: {},
      supportedPlatforms: ['win32', 'linux', 'darwin']
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[register-default-engines] Generated manifest.json for ${pkg}`);
  }
  
  try {
    const txId = await pm.installPackage(pkgDir, { force: true });
    console.log(`[register-default-engines] ✔ Successfully installed ${pkg}. Transaction ID: ${txId}`);
  } catch (err) {
    console.error(`[register-default-engines] ❌ Failed to install ${pkg}:`, err.message);
  }
}

// List all engines registered now
const engines = pm.listEngines();
console.log(`[register-default-engines] Registry now contains ${engines.length} engine(s):`);
for (const e of engines) {
  console.log(`  - ${e.id} (${e.displayName}) v${e.version} — enabled: ${e.enabled}`);
}
