import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import {
  SourceAnalyzer,
  CodeCompiler,
  PackageBuilder,
  BundleBuilder,
  ManifestGenerator,
  SbomGenerator,
  DigitalSigner,
  ReleaseVerifier,
  GithubPublisher,
  BuilderCli
} from '../index.js';

describe('AEGIS Builder (AEB) Integration Tests', () => {
  const workspaceRoot = process.cwd();
  const testReleaseDir = path.resolve(workspaceRoot, 'test-release');
  
  let analyzer: SourceAnalyzer;
  let compiler: CodeCompiler;
  let packageBuilder: PackageBuilder;
  let bundleBuilder: BundleBuilder;
  let manifestGenerator: ManifestGenerator;
  let sbomGenerator: SbomGenerator;
  let signer: DigitalSigner;
  let verifier: ReleaseVerifier;
  let publisher: GithubPublisher;

  before(async () => {
    if (existsSync(testReleaseDir)) {
      await fs.rm(testReleaseDir, { recursive: true, force: true });
    }
    await fs.mkdir(testReleaseDir, { recursive: true });

    analyzer = new SourceAnalyzer(workspaceRoot);
    compiler = new CodeCompiler(workspaceRoot);
    packageBuilder = new PackageBuilder();
    bundleBuilder = new BundleBuilder();
    manifestGenerator = new ManifestGenerator();
    sbomGenerator = new SbomGenerator();
    signer = new DigitalSigner();
    verifier = new ReleaseVerifier(signer);
    publisher = new GithubPublisher();
  });

  after(async () => {
    if (existsSync(testReleaseDir)) {
      await fs.rm(testReleaseDir, { recursive: true, force: true });
    }
  });

  test('Source Discovery and Dependency resolution', async () => {
    const pkgs = await analyzer.discoverPackages();
    assert.ok(pkgs.length > 0);

    const runtimePkg = pkgs.find(p => p.id === 'aegis-runtime');
    assert.ok(runtimePkg);

    const order = analyzer.getBuildOrder(pkgs);
    assert.ok(order.length > 0);
  });

  test('Package compilation, serialization, and signatures', async () => {
    const pkgs = await analyzer.discoverPackages();
    const targetPkg = pkgs.find(p => p.id === 'aegis-builder')!;

    // Compile
    const compileOk = await compiler.compileTypeScript(targetPkg, 'Testing');
    assert.ok(compileOk);

    // Package
    const pkgPath = await packageBuilder.buildPackage(targetPkg, testReleaseDir);
    assert.ok(existsSync(pkgPath));

    // Sign
    const signature = await signer.signPackage(pkgPath);
    assert.ok(signature);

    // Verify
    const verifyOk = await signer.verifyPackage(pkgPath);
    assert.ok(verifyOk);
  });

  test('Manifest and SBOM compilation', async () => {
    const pkgs = await analyzer.discoverPackages();
    const checksums = { 'aegis-builder': 'sha256:mock_checksum' };
    const bundlesSpec = { developer: ['aegis-builder'] };

    const manifestPath = await manifestGenerator.generateManifest(
      '1.0.0',
      '404',
      'canary',
      checksums,
      bundlesSpec,
      testReleaseDir
    );
    assert.ok(existsSync(manifestPath));

    const sbomPath = await sbomGenerator.generateSbom(pkgs, checksums, testReleaseDir, 'SPDX');
    assert.ok(existsSync(sbomPath));
  });

  test('Full release directory verification', async () => {
    const pkgs = await analyzer.discoverPackages();
    const builderPkg = pkgs.find(p => p.id === 'aegis-builder')!;
    const testDir = path.join(testReleaseDir, 'full-release');

    // Package
    const pkgPath = await packageBuilder.buildPackage(builderPkg, testDir);
    await signer.signPackage(pkgPath);

    const checksums = { 'aegis-builder': 'sha256:mock_checksum' };
    const bundlesSpec = { developer: ['aegis-builder'] };

    // Bundle
    await bundleBuilder.buildBundle({
      name: 'developer',
      description: 'Test development bundle',
      packages: ['aegis-builder']
    }, checksums, testDir);

    // Manifest & SBOM
    await manifestGenerator.generateManifest('1.0.0', '101', 'nightly', checksums, bundlesSpec, testDir);
    await sbomGenerator.generateSbom(pkgs, checksums, testDir, 'SPDX');

    const res = await verifier.verifyRelease(testDir);
    assert.ok(res.valid);
  });

  test('GitHub Release publication simulation', async () => {
    const ok = await publisher.publishRelease('v1.0.0-rc1', testReleaseDir);
    assert.ok(ok);
  });

  test('CLI command runner processing', async () => {
    const cli = new BuilderCli(workspaceRoot);
    const code = await cli.run(['doctor']);
    assert.strictEqual(code, 0);
  });
});
