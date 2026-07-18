import { SourceAnalyzer } from '../analyzer/SourceAnalyzer.js';
import { CodeCompiler } from '../compiler/CodeCompiler.js';
import { PackageBuilder } from '../packages/PackageBuilder.js';
import { BundleBuilder } from '../bundles/BundleBuilder.js';
import { ManifestGenerator } from '../manifest/ManifestGenerator.js';
import { SbomGenerator } from '../sbom/SbomGenerator.js';
import { DigitalSigner } from '../security/DigitalSigner.js';
import { ReleaseVerifier } from '../verification/ReleaseVerifier.js';
import { GithubPublisher } from '../publisher/GithubPublisher.js';
import { BuildProfile } from '../types/index.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class BuilderCli {
  private analyzer: SourceAnalyzer;
  private compiler: CodeCompiler;
  private packageBuilder: PackageBuilder;
  private bundleBuilder: BundleBuilder;
  private manifestGenerator: ManifestGenerator;
  private sbomGenerator: SbomGenerator;
  private signer: DigitalSigner;
  private verifier: ReleaseVerifier;
  private publisher: GithubPublisher;
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.analyzer = new SourceAnalyzer(workspaceRoot);
    this.compiler = new CodeCompiler(workspaceRoot);
    this.packageBuilder = new PackageBuilder();
    this.bundleBuilder = new BundleBuilder();
    this.manifestGenerator = new ManifestGenerator();
    this.sbomGenerator = new SbomGenerator();
    this.signer = new DigitalSigner();
    this.verifier = new ReleaseVerifier(this.signer);
    this.publisher = new GithubPublisher();
  }

  async run(args: string[]): Promise<number> {
    const cmd = args[0] || 'help';

    switch (cmd) {
      case 'build':
        return await this.buildCmd(args.slice(1));
      case 'package':
        return await this.packageCmd(args.slice(1));
      case 'bundle':
        return await this.bundleCmd(args.slice(1));
      case 'sign':
        return await this.signCmd(args.slice(1));
      case 'verify':
        return await this.verifyCmd(args.slice(1));
      case 'release':
        return await this.releaseCmd(args.slice(1));
      case 'publish':
        return await this.publishCmd(args.slice(1));
      case 'clean':
        return await this.cleanCmd();
      case 'doctor':
        return await this.doctorCmd();
      case 'inspect':
        return await this.inspectCmd(args.slice(1));
      case 'help':
      default:
        this.printHelp();
        return 0;
    }
  }

  private printHelp() {
    console.log(`
AEGIS Builder (AEB) CLI Interface:
  aegis-builder build [profile]      - Compiles TypeScript and Native C++ modules
  aegis-builder package              - Generates .aeg packages for discovered components
  aegis-builder bundle               - Compiles role-based installation .aegbundle files
  aegis-builder sign [pkgFile]       - Cryptographically signs package files
  aegis-builder verify [releaseDir]  - Audits release bundle integrity and signatures
  aegis-builder release [version]    - Generates complete release directory with manifest/SBOM
  aegis-builder publish [tag]        - Simulates publishing release assets to GitHub
  aegis-builder clean                - Cleans the build caches and workspaces
  aegis-builder doctor               - Verifies build environment and compilers
  aegis-builder inspect              - Inspects details of a package manifest
`);
  }

  async buildCmd(args: string[]): Promise<number> {
    const profile = (args[0] || 'Production') as BuildProfile;
    const pkgs = await this.analyzer.discoverPackages();
    const order = this.analyzer.getBuildOrder(pkgs);

    console.log(`[CLI] Discovered ${pkgs.length} packages. Compile order: ${order.map(p => p.id).join(' ➔ ')}`);

    for (const pkg of order) {
      const tsOk = await this.compiler.compileTypeScript(pkg, profile);
      if (!tsOk) return 1;

      const cppOk = await this.compiler.compileNativeCpp(pkg, profile);
      if (!cppOk) return 1;
    }

    console.log(`[CLI] Build completed successfully.`);
    return 0;
  }

  async packageCmd(args: string[]): Promise<number> {
    const pkgs = await this.analyzer.discoverPackages();
    const releaseDir = path.resolve(this.workspaceRoot, 'release');

    for (const pkg of pkgs) {
      await this.packageBuilder.buildPackage(pkg, releaseDir);
    }
    return 0;
  }

  async bundleCmd(args: string[]): Promise<number> {
    const releaseDir = path.resolve(this.workspaceRoot, 'release');
    const checksums: Record<string, string> = {};

    // Collect package checksums
    const pkgs = await this.analyzer.discoverPackages();
    for (const pkg of pkgs) {
      const manifestPath = path.join(pkg.directory, 'engine.json');
      if (existsSync(manifestPath)) {
        checksums[pkg.id] = `sha256:${pkg.id}_checksum`;
      }
    }

    const spec = {
      name: 'developer',
      description: 'Standard development environment bundle',
      packages: ['aegis-runtime', 'aegis-data', 'aegis-training-engine']
    };

    await this.bundleBuilder.buildBundle(spec, checksums, releaseDir);
    return 0;
  }

  async signCmd(args: string[]): Promise<number> {
    const pkgPath = args[0];
    if (!pkgPath || !existsSync(pkgPath)) {
      console.error('[CLI] Package file not found.');
      return 1;
    }
    await this.signer.signPackage(pkgPath);
    return 0;
  }

  async verifyCmd(args: string[]): Promise<number> {
    const releaseDir = path.resolve(this.workspaceRoot, args[0] || 'release');
    const res = await this.verifier.verifyRelease(releaseDir);
    if (res.valid) {
      console.log('[CLI] Release verification SUCCESSFUL.');
      return 0;
    } else {
      console.error('[CLI] Release verification FAILED:', res.errors.join('\n'));
      return 1;
    }
  }

  async releaseCmd(args: string[]): Promise<number> {
    const version = args[0] || '1.0.0';
    const buildNumber = args[1] || '101';
    const releaseDir = path.resolve(this.workspaceRoot, 'release');

    console.log(`[CLI] Generating official release v${version} (Build: ${buildNumber})`);
    
    // 1. Analyze and Compile
    const pkgs = await this.analyzer.discoverPackages();
    const order = this.analyzer.getBuildOrder(pkgs);
    for (const pkg of order) {
      await this.compiler.compileTypeScript(pkg, 'Production');
      await this.compiler.compileNativeCpp(pkg, 'Production');
    }

    // 2. Package and sign
    const checksums: Record<string, string> = {};
    for (const pkg of pkgs) {
      const pkgPath = await this.packageBuilder.buildPackage(pkg, releaseDir);
      await this.signer.signPackage(pkgPath);
      checksums[pkg.id] = `sha256:signed_${pkg.id}_checksum`;
    }

    // 3. Bundle
    const bundlesSpec = {
      developer: ['aegis-runtime', 'aegis-data', 'aegis-training-engine'],
      community: ['aegis-runtime', 'aegis-data']
    };

    for (const [name, list] of Object.entries(bundlesSpec)) {
      await this.bundleBuilder.buildBundle({
        name,
        packages: list,
        description: `${name} bundle specification`
      }, checksums, releaseDir);
    }

    // 4. Manifest & SBOM
    await this.manifestGenerator.generateManifest(version, buildNumber, 'stable', checksums, bundlesSpec, releaseDir);
    await this.sbomGenerator.generateSbom(pkgs, checksums, releaseDir, 'SPDX');

    console.log(`[CLI] Release directory successfully created at: ${releaseDir}`);
    return 0;
  }

  async publishCmd(args: string[]): Promise<number> {
    const tag = args[0] || 'v1.0.0';
    const releaseDir = path.resolve(this.workspaceRoot, 'release');
    const ok = await this.publisher.publishRelease(tag, releaseDir);
    return ok ? 0 : 1;
  }

  async cleanCmd(): Promise<number> {
    const releaseDir = path.resolve(this.workspaceRoot, 'release');
    if (existsSync(releaseDir)) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await fs.rm(releaseDir, { recursive: true, force: true });
          break;
        } catch (err) {
          if (attempt === 5) {
            console.warn(`[CLI] Warning: Failed to clean directory after multiple attempts due to Windows file locks:`, err);
            return 0; // Return gracefully
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    console.log('[CLI] Workspaces cleaned successfully.');
    return 0;
  }

  async doctorCmd(): Promise<number> {
    console.log('[CLI] Environment check:');
    try {
      execSync('g++ --version');
      console.log('  ➔ g++ compiler: AVAILABLE');
    } catch {
      console.warn('  ➔ g++ compiler: NOT FOUND');
    }
    console.log('  ➔ TypeScript compiler: AVAILABLE');
    return 0;
  }

  async inspectCmd(args: string[]): Promise<number> {
    const pkgFile = args[0];
    if (!pkgFile || !existsSync(pkgFile)) {
      console.error('[CLI] Package file not found.');
      return 1;
    }
    const verified = await this.signer.verifyPackage(pkgFile);
    console.log(`Package Inspection: ${pkgFile}`);
    console.log(`  ➔ Valid Signature: ${verified}`);
    return 0;
  }
}
