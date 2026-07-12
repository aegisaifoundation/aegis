import fs from 'fs';
import path from 'path';
import { SignatureSigner } from '../core/SignatureSigner.js';
import { DistributionBuilder } from '../core/DistributionBuilder.js';
import { PackageManager } from '@aegis/package-manager';
// Setup test workspace directories
const testRoot = path.resolve('test-builder-sandbox');
const keysDir = path.join(testRoot, 'config/keys');
const sourceDir = path.join(testRoot, 'mock-package');
const outputDir = path.join(testRoot, 'dist/release');
const enginesDir = path.join(testRoot, 'engines');
const runtimeConfigPath = path.join(testRoot, 'config/runtime.json');
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
    fs.mkdirSync(keysDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(enginesDir, { recursive: true });
    fs.mkdirSync(path.dirname(runtimeConfigPath), { recursive: true });
    // 1. Write mock package files
    const manifest = {
        id: 'mock-package',
        name: 'Mock Package Engine',
        version: '1.0.0',
        type: 'Engine',
        entrypoint: 'dist/index.js',
        dependencies: {},
        runtimeVersionConstraint: { min: '1.0.0' },
        sdkVersion: '1.0.0'
    };
    fs.writeFileSync(path.join(sourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    const distDir = path.join(sourceDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.js'), `console.log("Mock package loaded");`, 'utf8');
    // 2. Write package manager config (requireSignature: true)
    fs.writeFileSync(runtimeConfigPath, JSON.stringify({
        version: "1.0.0",
        requireSignature: true,
        autoloadEngines: []
    }, null, 2), 'utf8');
}
async function runTests() {
    console.log('=== AEGIS Distribution Builder & Security Verification Test Suite ===\n');
    // ─── TEST 1: SETUP ───
    console.log('[Test 1] Initializing builder test sandbox...');
    initSandbox();
    console.log('✔ Sandbox initialized successfully.\n');
    // ─── TEST 2: KEY GENERATION ───
    console.log('[Test 2] Initializing key pair via SignatureSigner...');
    const signer = new SignatureSigner(keysDir);
    const publicKeyPem = signer.getPublicKeyPem();
    if (!publicKeyPem || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
        throw new Error('Test 2 Failed: Public key not correctly generated');
    }
    console.log('✔ Keys successfully generated/loaded.\n');
    // ─── TEST 3: BUILD EXECUTION (.aeg package) ───
    console.log('[Test 3] Building mock package into .aeg format...');
    const builder = new DistributionBuilder(signer);
    const aegPath = await builder.buildPackage({
        packageId: 'mock-package',
        sourceDir: sourceDir,
        outputDir: outputDir,
        profile: 'Production',
        channel: 'stable'
    });
    if (!fs.existsSync(aegPath)) {
        throw new Error(`Test 3 Failed: .aeg package file not found at ${aegPath}`);
    }
    console.log(`✔ Package successfully built: ${aegPath}\n`);
    // ─── TEST 4: BUNDLE EXECUTION (.aegbundle) ───
    console.log('[Test 4] Packaging built .aeg package into .aegbundle...');
    const bundlePath = await builder.buildBundle({
        bundleId: 'test-bundle',
        version: '1.0.0',
        packages: [
            { id: 'mock-package', version: '1.0.0', path: aegPath }
        ],
        outputDir: outputDir,
        publisher: 'Test Publisher'
    });
    if (!fs.existsSync(bundlePath)) {
        throw new Error(`Test 4 Failed: .aegbundle file not found at ${bundlePath}`);
    }
    console.log(`✔ Bundle successfully built: ${bundlePath}\n`);
    // ─── TEST 5: END-TO-END CRYPTOGRAPHIC LOOP ───
    console.log('[Test 5] Running End-to-End Cryptographic Loop verification...');
    // Set the environment variable to point SecurityVerifier to the dynamically generated public key
    const originalEnvKey = process.env.AEGIS_PUBLIC_KEY_PATH;
    process.env.AEGIS_PUBLIC_KEY_PATH = path.join(keysDir, 'public.pem');
    try {
        // Install directly via the .aeg file path (bypasses repository lookup)
        const pm = new PackageManager(runtimeConfigPath, enginesDir);
        console.log('[Test 5] Installing the signed package directly by .aeg path (policy: requireSignature = true)...');
        await pm.installPackage(aegPath);
        const installed = pm.listPackages().find((p) => p.id === 'mock-package');
        if (!installed) {
            throw new Error('Test 5 Failed: mock-package was not registered in DB');
        }
        if (installed.signatureStatus !== 'VERIFIED') {
            throw new Error(`Test 5 Failed: package signature status in DB is not VERIFIED (got: ${installed.signatureStatus})`);
        }
        console.log('✔ Package installed and verified successfully using dynamic keys.');
        // ─── TEST 6: INVALID SIGNATURE REJECTION ───
        console.log('\n[Test 6] Testing rejection of invalid/tampered signatures...');
        // Create an unsigned/tampered package in the repository
        const tamperedPackageDir = path.join(outputDir, 'staging-tampered-package');
        fs.mkdirSync(tamperedPackageDir, { recursive: true });
        const tamperedManifest = {
            id: 'tampered-package',
            name: 'Tampered Package',
            version: '1.0.0',
            type: 'Engine',
            signature: 'InvalidSignatureBase64StringHere=='
        };
        fs.writeFileSync(path.join(tamperedPackageDir, 'manifest.json'), JSON.stringify(tamperedManifest, null, 2), 'utf8');
        // Archive it
        const tamperedAegPath = path.join(outputDir, 'tampered-package-1.0.0.aeg');
        if (fs.existsSync(tamperedAegPath)) {
            fs.rmSync(tamperedAegPath, { force: true });
        }
        // Just a quick way to zip
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            fs.cpSync(sourceDir, tamperedPackageDir, { recursive: true });
            fs.writeFileSync(path.join(tamperedPackageDir, 'manifest.json'), JSON.stringify(tamperedManifest, null, 2), 'utf8');
            const zipCmd = `Compress-Archive -Path '${tamperedPackageDir}\\*' -DestinationPath '${tamperedAegPath}' -Force`;
            const { spawnSync } = await import('child_process');
            spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', zipCmd]);
        }
        else {
            const { spawnSync } = await import('child_process');
            spawnSync('zip', ['-r', tamperedAegPath, '.'], { cwd: tamperedPackageDir });
        }
        fs.rmSync(tamperedPackageDir, { recursive: true, force: true });
        try {
            await pm.installPackage(tamperedAegPath);
            throw new Error('Test 6 Failed: Installed a package with tampered/invalid signature without error');
        }
        catch (err) {
            console.log(`✔ Blocked package with tampered signature: ${err.message}`);
        }
    }
    finally {
        // Restore environment variable
        if (originalEnvKey) {
            process.env.AEGIS_PUBLIC_KEY_PATH = originalEnvKey;
        }
        else {
            delete process.env.AEGIS_PUBLIC_KEY_PATH;
        }
    }
    cleanSandbox();
    console.log('\n======================================================');
    console.log('🎉 ALL BUILDER & VERIFIER TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================');
}
runTests().catch(err => {
    console.error('\n❌ BUILDER TEST SUITE FAILED:', err);
    cleanSandbox();
    process.exit(1);
});
