// install-die.mjs — Installs the Distributed Intelligence Engine via @aegis/package-manager
// Run: node install-die.mjs

import path from 'path';
import { fileURLToPath } from 'url';
import { PackageManager } from './packages/aegis-package-manager/dist/core/PackageManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const configPath  = path.join(__dirname, 'packages/aegis-runtime/src/config/runtime.json');
const enginesDir  = path.join(__dirname, 'workspace/engines');
const packagePath = path.join(__dirname, 'packages/aegis-distributed-intelligence');

const pm = new PackageManager(configPath, enginesDir);

// Disable signature requirement for local development packages
// (override via runtime.json or env if needed)
console.log('[install-die] Installing Distributed Intelligence Engine...');
console.log(`[install-die] Package path: ${packagePath}`);

try {
  const txId = await pm.installPackage(packagePath, { force: true });
  console.log(`[install-die] ✔ Installation complete. Transaction ID: ${txId}`);
  
  const engines = pm.listEngines();
  console.log(`[install-die] Registry now contains ${engines.length} engine(s):`);
  for (const e of engines) {
    console.log(`  - ${e.id} (${e.displayName}) v${e.version} — enabled: ${e.enabled}`);
  }
} catch (err) {
  console.error('[install-die] ❌ Installation failed:', err.message);
  process.exit(1);
}
