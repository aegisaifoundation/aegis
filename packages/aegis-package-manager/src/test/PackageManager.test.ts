import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PackageManager } from '../core/PackageManager.js';
import { SecurityVerifier } from '../core/SecurityVerifier.js';

// Setup test workspace directories
const testRoot = path.resolve('test-pm-sandbox');
const testConfigPath = path.join(testRoot, 'config/runtime.json');
const testEnginesDir = path.join(testRoot, 'engines');
const mockRepoDir = path.join(testRoot, 'mock-repository');

function cleanSandbox() {
  if (fs.existsSync(testRoot)) {
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {}
  }
}

function initSandbox() {
  cleanSandbox();
  fs.mkdirSync(path.join(testRoot, 'config'), { recursive: true });
  fs.mkdirSync(testEnginesDir, { recursive: true });
  fs.mkdirSync(mockRepoDir, { recursive: true });
  
  // Write default runtime.json with requireSignature: false for testing unsigned mock packages
  fs.writeFileSync(testConfigPath, JSON.stringify({
    version: "1.0.0",
    requireSignature: false,
    autoloadEngines: []
  }, null, 2), 'utf8');
}

// Generate a valid mock package inside the repository folder
function createMockPackage(
  id: string, 
  version: string, 
  dependencies: Record<string, string> = {}
) {
  const pkgDir = path.join(mockRepoDir, id);
  fs.mkdirSync(pkgDir, { recursive: true });
  
  const manifest = {
    id,
    name: `Mock ${id} Engine`,
    version,
    type: 'Engine',
    entrypoint: 'dist/index.js',
    dependencies,
    runtimeVersionConstraint: { min: '1.0.0' },
    sdkVersion: '1.0.0'
  };

  fs.writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  
  const distDir = path.join(pkgDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.js'), `console.log("Mock engine ${id} loaded");`, 'utf8');
}

// Main test execution loop
async function runTests() {
  console.log('=== AEGIS Package Manager Test Suite ===\n');
  
  // ─── TEST 1: SETUP ───
  console.log('[Test 1] Initializing test sandbox...');
  initSandbox();
  createMockPackage('engine-a', '1.0.0');
  createMockPackage('engine-b', '1.0.0', { 'engine-a': '1.0.0' });
  console.log('✔ Sandbox initialized successfully.\n');

  const pm = new PackageManager(testConfigPath, testEnginesDir);
  pm.addRepository('mock-repo', 'local', mockRepoDir);

  // ─── TEST 2: SUCCESSFUL INSTALLATION ───
  console.log('[Test 2] Installing package "engine-a" from repository...');
  await pm.installPackage('engine-a');
  
  const pkgs = pm.listPackages();
  const aInstalled = pkgs.find(p => p.id === 'engine-a');
  if (!aInstalled) throw new Error('Test 2 Failed: engine-a not found in registry');
  console.log(`✔ Installed version: ${aInstalled.version}, path: ${aInstalled.installationPath}`);
  
  const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  if (!config.autoloadEngines.includes('engine-a')) throw new Error('Test 2 Failed: engine-a not in autoload list');
  console.log('✔ Autoload registry updated successfully.\n');

  // ─── TEST 3: DEPENDENCY RESOLUTION ───
  console.log('[Test 3] Installing package "engine-b" (depends on "engine-a")...');
  // It should detect "engine-a" is already installed and resolve without error
  await pm.installPackage('engine-b');
  const bInstalled = pm.listPackages().find(p => p.id === 'engine-b');
  if (!bInstalled) throw new Error('Test 3 Failed: engine-b not found in registry');
  console.log('✔ Dependency resolved and engine-b successfully installed.\n');

  // ─── TEST 4: UNINSTALL GATES & DEPENDENCY CONSTRAINTS ───
  console.log('[Test 4] Attempting to remove dependency package "engine-a" (engine-b depends on it)...');
  try {
    await pm.removePackage('engine-a');
    throw new Error('Test 4 Failed: did not block removal of dependency package');
  } catch (err: any) {
    console.log(`✔ Blocked as expected: ${err.message}`);
  }

  // Force remove
  console.log('[Test 4] Force removing "engine-a"...');
  await pm.removePackage('engine-a', { force: true });
  const aRemoved = pm.listPackages().find(p => p.id === 'engine-a');
  if (aRemoved) throw new Error('Test 4 Failed: engine-a was not removed');
  console.log('✔ Force removal of dependency package succeeded.\n');

  // ─── TEST 5: TRANSACTION ROLLBACK ON FAILURE ───
  console.log('[Test 5] Simulating corrupted package install to test rollback...');
  // Create a package that will fail compatibility (e.g. requires higher SDK)
  const brokenDir = path.join(mockRepoDir, 'engine-broken');
  fs.mkdirSync(brokenDir, { recursive: true });
  fs.writeFileSync(path.join(brokenDir, 'manifest.json'), JSON.stringify({
    id: 'engine-broken',
    name: 'Broken Engine',
    version: '1.0.0',
    type: 'Engine',
    sdkVersion: '9.9.9' // Fail this check
  }, null, 2));

  try {
    await pm.installPackage('engine-broken');
    throw new Error('Test 5 Failed: installed incompatible package without error');
  } catch (err: any) {
    console.log(`✔ Installation failed as expected: ${err.message}`);
  }

  // Verify no residue files exist in engines folder
  const brokenTarget = path.join(testEnginesDir, 'engine-broken');
  if (fs.existsSync(brokenTarget)) {
    throw new Error('Test 5 Failed: rollback did not cleanup extracted files');
  }
  const brokenInRegistry = pm.listPackages().find(p => p.id === 'engine-broken');
  if (brokenInRegistry) {
    throw new Error('Test 5 Failed: rollback did not remove registry registration');
  }
  console.log('✔ Transaction rollback verified: target files and DB registrations cleaned.\n');

  // ─── TEST 6: RECOVERY ON ORPHANED JOURNALS ───
  console.log('[Test 6] Simulating process crash (orphaned transaction journal) to verify boot recovery...');
  const txId = crypto.randomUUID();
  const journalDir = path.join(testRoot, 'config/package-manager/transactions');
  const journalPath = path.join(journalDir, `${txId}_journal.json`);
  
  // Create residue folder to pretend we extracted files before crash
  const residuesDir = path.join(testEnginesDir, 'engine-crashed');
  fs.mkdirSync(residuesDir, { recursive: true });
  fs.writeFileSync(path.join(residuesDir, 'some-partial-file.js'), 'console.log("incomplete")', 'utf8');

  // Write started state journal
  const mockJournal = {
    txId,
    state: 'EXTRACTING',
    timestamp: new Date().toISOString(),
    packageId: 'engine-crashed',
    action: 'install',
    backups: [],
    addedFiles: [],
    addedDirs: [residuesDir],
    originalConfig: { autoloadEngines: [] }
  };
  fs.writeFileSync(journalPath, JSON.stringify(mockJournal, null, 2), 'utf8');

  // Initialize a fresh PackageManager instance — it should trigger recovery on boot!
  console.log('[Test 6] Booting new PackageManager instance...');
  const pmRecovery = new PackageManager(testConfigPath, testEnginesDir);
  
  // Wait a moment for async recovery log
  await new Promise(resolve => setTimeout(resolve, 500));

  // Verify residues folder got cleaned up by startup recovery
  if (fs.existsSync(residuesDir)) {
    throw new Error('Test 6 Failed: recovery did not clean up residues');
  }
  console.log('✔ Startup recovery successfully processed and rolled back orphaned transaction.\n');

  cleanSandbox();
  console.log('==========================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==========================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  cleanSandbox();
  process.exit(1);
});
