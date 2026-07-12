import fs from 'fs';
import path from 'path';
import net from 'net';
import { PackageManager } from '../core/PackageManager.js';
import { RegistryLoader } from '../../../aegis-runtime/dist/registry/RegistryLoader.js';
import { IpcServer } from '../../../aegis-runtime/dist/transports/IpcServer.js';
import { getIpcPath } from '../../../aegis-runtime/dist/transports/IpcPath.js';
const testRoot = path.resolve('test-registry-sandbox');
const testConfigPath = path.join(testRoot, 'config/runtime.json');
const testEnginesDir = path.join(testRoot, 'engines');
const mockRepoDir = path.join(testRoot, 'mock-repository');
function cleanSandbox() {
    if (fs.existsSync(testRoot)) {
        try {
            fs.rmSync(testRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function initSandbox() {
    cleanSandbox();
    fs.mkdirSync(path.join(testRoot, 'config'), { recursive: true });
    fs.mkdirSync(testEnginesDir, { recursive: true });
    fs.mkdirSync(mockRepoDir, { recursive: true });
    fs.writeFileSync(testConfigPath, JSON.stringify({
        version: "1.0.0",
        requireSignature: false,
        autoloadEngines: []
    }, null, 2), 'utf8');
}
function createMockEnginePackage(id, version) {
    const pkgDir = path.join(mockRepoDir, id);
    fs.mkdirSync(pkgDir, { recursive: true });
    const manifest = {
        id,
        name: `Mock ${id} Engine`,
        version,
        type: 'Engine',
        entrypoint: 'dist/index.js',
        dependencies: {},
        runtimeVersionConstraint: { min: '1.0.0' },
        sdkVersion: '1.0.0',
        kernelApiVersion: '1.0.0'
    };
    fs.writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    const distDir = path.join(pkgDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    // Write valid IEngine export class to pass RegistryLoader validation!
    fs.writeFileSync(path.join(distDir, 'index.js'), `
    export class MockEngine {
      constructor() {
        this.metadata = { id: "${id}", displayName: "Mock ${id} Engine" };
      }
      async initialize(ctx) {}
      async start() {}
      async shutdown() {}
    }
  `, 'utf8');
}
async function runTests() {
    console.log('=== AEGIS Engine Registry & IPC Test Suite ===\n');
    // 1. Setup Sandbox
    console.log('[Test 1] Initializing mock sandbox...');
    initSandbox();
    createMockEnginePackage('engine-a', '1.0.0');
    createMockEnginePackage('engine-b', '1.0.0');
    console.log('✔ Mock packages created.\n');
    const pm = new PackageManager(testConfigPath, testEnginesDir);
    pm.addRepository('mock-repo', 'local', mockRepoDir);
    // 2. Install Packages -> Verify Registry file created with simplified schema
    console.log('[Test 2] Installing engines and verifying registry file generation...');
    await pm.installPackage('engine-a');
    await pm.installPackage('engine-b');
    const registryPath = path.join(testRoot, 'workspace/registry/engines.json');
    if (!fs.existsSync(registryPath)) {
        throw new Error('Test 2 Failed: registry engines.json was not created');
    }
    const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (registryData.version !== '1.0.0') {
        throw new Error(`Test 2 Failed: wrong registry version "${registryData.version}"`);
    }
    if (registryData.engines.length !== 2) {
        throw new Error(`Test 2 Failed: expected 2 engines, found ${registryData.engines.length}`);
    }
    // Verify simplified schema format (no health, no status)
    const entryA = registryData.engines.find((e) => e.id === 'engine-a');
    if (!entryA || entryA.health || entryA.status || !entryA.entry || !entryA.manifest) {
        throw new Error('Test 2 Failed: Registry schema is not simplified');
    }
    console.log('✔ Registry engines.json verified successfully.\n');
    // 3. Test Enable / Disable
    console.log('[Test 3] Testing enable / disable commands...');
    await pm.disableEngine('engine-a');
    let regStr = fs.readFileSync(registryPath, 'utf8');
    let reg = JSON.parse(regStr);
    let disabledA = reg.engines.find((e) => e.id === 'engine-a');
    if (disabledA.enabled !== false) {
        throw new Error('Test 3 Failed: engine-a was not marked disabled');
    }
    await pm.enableEngine('engine-a');
    regStr = fs.readFileSync(registryPath, 'utf8');
    reg = JSON.parse(regStr);
    let enabledA = reg.engines.find((e) => e.id === 'engine-a');
    if (enabledA.enabled !== true) {
        throw new Error('Test 3 Failed: engine-a was not marked enabled');
    }
    console.log('✔ Engine enable / disable states synced with registry.\n');
    // 4. Test RegistryLoader and Registry Recovery
    console.log('[Test 4] Testing RegistryLoader and automatic corruption recovery...');
    // Mock RuntimeContext
    const runtimeContext = {
        kernelVersion: '1.0.0',
        getWorkspacePath: () => path.join(testRoot, 'workspace'),
        getEventBus: () => null
    };
    // Load normally
    const loaded = await RegistryLoader.loadRegistry(runtimeContext);
    if (loaded.length !== 2) {
        throw new Error(`Test 4 Failed: RegistryLoader loaded ${loaded.length} engines, expected 2`);
    }
    // Corrupt registry file
    fs.writeFileSync(registryPath, 'CORRUPTED_JSON_CONTENT', 'utf8');
    // Load again - it should fail parsing, recover from snapshots, and return valid engines!
    const recovered = await RegistryLoader.loadRegistry(runtimeContext);
    if (recovered.length !== 2) {
        throw new Error(`Test 4 Failed: RegistryLoader recovery failed, loaded ${recovered.length} engines`);
    }
    // Verify main engines.json is restored
    const restoredRaw = fs.readFileSync(registryPath, 'utf8');
    if (restoredRaw === 'CORRUPTED_JSON_CONTENT') {
        throw new Error('Test 4 Failed: engines.json file was not overwritten during recovery');
    }
    console.log('✔ Registry recovery from history snapshots successfully verified.\n');
    // 5. Test Versioned IPC Server and protocol triggers
    console.log('[Test 5] Testing Versioned IPC Control Channel...');
    const ipcServer = new IpcServer(path.join(testRoot, 'workspace'));
    ipcServer.start();
    const ipcPath = getIpcPath(path.join(testRoot, 'workspace'));
    // A. Test Protocol Version Mismatch Check
    await new Promise((resolve, reject) => {
        const client = net.connect(ipcPath, () => {
            client.write(JSON.stringify({
                version: '9.9.9', // invalid version
                requestId: 'req-123',
                command: 'reload',
                payload: {}
            }));
        });
        client.on('data', (data) => {
            try {
                const resp = JSON.parse(data.toString());
                if (resp.error && resp.error.includes('Incompatible protocol version')) {
                    console.log('✔ Mismatch protocol version check blocked client successfully.');
                    resolve();
                }
                else {
                    reject(new Error('IPC Server did not reject protocol version mismatch'));
                }
            }
            catch (err) {
                reject(err);
            }
        });
        client.on('error', reject);
    });
    // B. Test status command
    await new Promise((resolve, reject) => {
        const client = net.connect(ipcPath, () => {
            client.write(JSON.stringify({
                version: '1.0.0',
                requestId: 'req-456',
                command: 'status',
                payload: {}
            }));
        });
        client.on('data', (data) => {
            try {
                const resp = JSON.parse(data.toString());
                if (resp.result && resp.result.success) {
                    console.log(`✔ IPC status command returned: ${resp.result.engines.length} engines.`);
                    resolve();
                }
                else {
                    reject(new Error(resp.error || 'IPC command returned failed status'));
                }
            }
            catch (err) {
                reject(err);
            }
        });
        client.on('error', reject);
    });
    ipcServer.stop();
    cleanSandbox();
    console.log('==========================================');
    console.log('🎉 ALL REGISTRY & IPC TESTS PASSED! 🎉');
    console.log('==========================================');
}
runTests().catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    cleanSandbox();
    process.exit(1);
});
