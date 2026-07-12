#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { SignatureSigner } from './core/SignatureSigner.js';
import { DistributionBuilder } from './core/DistributionBuilder.js';

const program = new Command();

program
  .name('aegis-builder')
  .description('AEGIS Production Distribution Builder and Release Utility')
  .version('1.0.0');

// Helper to construct builder/signer
function getBuilder(keysDirOption?: string) {
  const keysDir = keysDirOption 
    ? path.resolve(keysDirOption) 
    : path.resolve('config/keys');
  
  const signer = new SignatureSigner(keysDir);
  const builder = new DistributionBuilder(signer);
  return { signer, builder };
}

// New standard CLI commands
program
  .command('build')
  .description('Builds a signed production .aeg package')
  .option('--package <id>', 'The identifier of the package')
  .option('--profile <profile>', 'Release profile: Development, Debug, Testing, Production, Enterprise', 'Production')
  .option('--channel <channel>', 'Release channel: stable, alpha, beta, nightly', 'stable')
  .option('--source <dir>', 'Source directory')
  .option('-o, --output-dir <dir>', 'Staging/output directory', 'dist/release')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .action(async (options) => {
    try {
      if (!options.package) {
        throw new Error('Please specify the package ID using --package <id>');
      }
      
      const packageId = options.package;
      const { builder } = getBuilder(options.keysDir);
      const outDir = path.resolve(options.outputDir);
      
      // Resolve source directory
      let srcDir = options.source;
      if (!srcDir) {
        // Try to search packages/<id> and apps/<id>
        const possiblePaths = [
          path.resolve('packages', packageId),
          path.resolve('apps', packageId),
          path.resolve(packageId)
        ];
        for (const p of possiblePaths) {
          if (fs.existsSync(path.join(p, 'manifest.json'))) {
            srcDir = p;
            break;
          }
        }
      }
      
      if (!srcDir || !fs.existsSync(srcDir)) {
        throw new Error(`Could not resolve source directory for package "${packageId}". Specify it manually with --source <dir>`);
      }

      const aegPath = await builder.buildPackage({
        packageId,
        sourceDir: path.resolve(srcDir),
        outputDir: outDir,
        profile: options.profile,
        channel: options.channel
      });

      console.log(`Successfully built package at: ${aegPath}`);
    } catch (err: any) {
      console.error(`Build failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('bundle')
  .description('Builds a signed .aegbundle from built .aeg package files')
  .option('--name <name>', 'The identifier of the bundle')
  .option('--packages <list>', 'Comma-separated package metadata references in format: "id@version" or "id@version:path"')
  .option('-v, --version <version>', 'Bundle version', '1.0.0')
  .option('-o, --output-dir <dir>', 'Staging/output directory', 'dist/release')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .option('-p, --publisher <publisher>', 'Publisher identity', 'AEGIS Foundation')
  .action(async (options) => {
    try {
      if (!options.name) {
        throw new Error('Please specify bundle name using --name <name>');
      }
      if (!options.packages) {
        throw new Error('Please specify packages using the --packages parameter: id@version,id@version');
      }

      const { builder } = getBuilder(options.keysDir);
      const outDir = path.resolve(options.outputDir);

      const rawPkgs = options.packages.split(',');
      const parsedPkgs = rawPkgs.map((raw: string) => {
        const atIndex = raw.indexOf('@');
        if (atIndex === -1) {
          throw new Error(`Invalid packages specification syntax: ${raw}. Expected format "id@version" or "id@version:path"`);
        }
        
        const colonIndex = raw.indexOf(':');
        let id: string;
        let version: string;
        let pkgPath: string;

        if (colonIndex !== -1) {
          id = raw.substring(0, atIndex);
          version = raw.substring(atIndex + 1, colonIndex);
          pkgPath = path.resolve(raw.substring(colonIndex + 1));
        } else {
          id = raw.substring(0, atIndex);
          version = raw.substring(atIndex + 1);
          // Look in output directory for the built package
          pkgPath = path.join(outDir, `${id}-${version}.aeg`);
        }

        return { id, version, path: pkgPath };
      });

      const bundlePath = await builder.buildBundle({
        bundleId: options.name,
        version: options.version,
        packages: parsedPkgs,
        outputDir: outDir,
        publisher: options.publisher
      });

      console.log(`Successfully built bundle at: ${bundlePath}`);
    } catch (err: any) {
      console.error(`Bundle failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('repository-export')
  .description('Scans built packages and bundles in directory and signs repository.json index')
  .option('--out <path>', 'Directory containing release packages and bundles')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .action(async (options) => {
    try {
      if (!options.out) {
        throw new Error('Please specify output directory using --out <path>');
      }
      const { builder } = getBuilder(options.keysDir);
      const dirPath = path.resolve(options.out);
      
      const indexPath = await builder.generateRepositoryIndex(dirPath);
      console.log(`Repository index generated: ${indexPath}`);
    } catch (err: any) {
      console.error(`Index generation failed: ${err.message}`);
      process.exit(1);
    }
  });

// Legacy command definitions for backwards compatibility
program
  .command('build-package')
  .description('Builds a signed production .aeg package from source directory')
  .argument('<packageId>', 'The identifier of the package')
  .argument('<sourceDir>', 'Path to the package source workspace directory')
  .option('-o, --output-dir <dir>', 'Staging/output directory', 'dist/release')
  .option('-p, --profile <profile>', 'Release profile: Development, Debug, Testing, Production, Enterprise', 'Production')
  .option('-c, --channel <channel>', 'Release channel: stable, alpha, beta, nightly', 'stable')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .action(async (packageId, sourceDir, options) => {
    try {
      const { builder } = getBuilder(options.keysDir);
      const outDir = path.resolve(options.outputDir);
      const srcDir = path.resolve(sourceDir);

      const aegPath = await builder.buildPackage({
        packageId,
        sourceDir: srcDir,
        outputDir: outDir,
        profile: options.profile,
        channel: options.channel
      });

      console.log(`Successfully built package at: ${aegPath}`);
    } catch (err: any) {
      console.error(`Build failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('build-bundle')
  .description('Builds a signed .aegbundle from built .aeg package files')
  .argument('<bundleId>', 'The identifier of the bundle')
  .argument('<version>', 'The version of the bundle')
  .option('-o, --output-dir <dir>', 'Staging/output directory', 'dist/release')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .option('-p, --publisher <publisher>', 'Publisher identity', 'AEGIS Foundation')
  .option('--pkgs <packages>', 'Comma-separated package metadata references in format: "id@version:path"')
  .action(async (bundleId, version, options) => {
    try {
      const { builder } = getBuilder(options.keysDir);
      const outDir = path.resolve(options.outputDir);

      if (!options.pkgs) {
        throw new Error('Please specify packages using the --pkgs parameter: id@version:path,id@version:path');
      }

      const rawPkgs = options.pkgs.split(',');
      const parsedPkgs = rawPkgs.map((raw: string) => {
        const atIndex = raw.indexOf('@');
        const colonIndex = raw.indexOf(':');
        if (atIndex === -1 || colonIndex === -1) {
          throw new Error(`Invalid packages specification syntax: ${raw}. Expected format "id@version:path"`);
        }
        return {
          id: raw.substring(0, atIndex),
          version: raw.substring(atIndex + 1, colonIndex),
          path: path.resolve(raw.substring(colonIndex + 1))
        };
      });

      const bundlePath = await builder.buildBundle({
        bundleId,
        version,
        packages: parsedPkgs,
        outputDir: outDir,
        publisher: options.publisher
      });

      console.log(`Successfully built bundle at: ${bundlePath}`);
    } catch (err: any) {
      console.error(`Bundle failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('generate-index')
  .description('Scans built packages and bundles in directory and signs repository.json index')
  .argument('<repoDir>', 'Directory containing release packages and bundles')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .action(async (repoDir, options) => {
    try {
      const { builder } = getBuilder(options.keysDir);
      const dirPath = path.resolve(repoDir);
      
      const indexPath = await builder.generateRepositoryIndex(dirPath);
      console.log(`Repository index generated: ${indexPath}`);
    } catch (err: any) {
      console.error(`Index generation failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('generate-release')
  .description('Generates a signed release.json global release manifest')
  .argument('<releaseVersion>', 'The overall system release version (e.g. 1.0.0)')
  .option('-o, --output-dir <dir>', 'Output directory', 'dist/release')
  .option('-k, --keys-dir <dir>', 'Path to directory containing RSA keys')
  .option('--pkgs <packages>', 'Comma-separated list of packages "id@version:checksum"')
  .option('--bundles <bundles>', 'Comma-separated list of bundles "id@version:checksum"')
  .action(async (releaseVersion, options) => {
    try {
      const { builder } = getBuilder(options.keysDir);
      const outDir = path.resolve(options.outputDir);

      const parsedPkgs = options.pkgs ? options.pkgs.split(',').map((raw: string) => {
        const atIdx = raw.indexOf('@');
        const colonIdx = raw.indexOf(':');
        return {
          id: raw.substring(0, atIdx),
          version: raw.substring(atIdx + 1, colonIdx),
          checksum: raw.substring(colonIdx + 1)
        };
      }) : [];

      const parsedBundles = options.bundles ? options.bundles.split(',').map((raw: string) => {
        const atIdx = raw.indexOf('@');
        const colonIdx = raw.indexOf(':');
        return {
          id: raw.substring(0, atIdx),
          version: raw.substring(atIdx + 1, colonIdx),
          checksum: raw.substring(colonIdx + 1)
        };
      }) : [];

      const releasePath = await builder.generateReleaseManifest({
        releaseVersion,
        packages: parsedPkgs,
        bundles: parsedBundles,
        outputDir: outDir
      });

      console.log(`Release manifest generated: ${releasePath}`);
    } catch (err: any) {
      console.error(`Release manifest failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
