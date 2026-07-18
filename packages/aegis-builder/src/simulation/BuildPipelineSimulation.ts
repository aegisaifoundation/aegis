import { BuilderCli } from '../cli/BuilderCli.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export async function runBuildSimulation() {
  console.log('='.repeat(70));
  console.log('             AEGIS BUILDER (AEB) PIPELINE SIMULATION');
  console.log('='.repeat(70));

  const workspaceRoot = process.cwd();
  const testReleaseDir = path.resolve(workspaceRoot, 'release');
  if (existsSync(testReleaseDir)) {
    await fs.rm(testReleaseDir, { recursive: true, force: true });
  }

  // Initialize Builder CLI
  const builder = new BuilderCli(workspaceRoot);

  // 1. Doctor command
  console.log('\n--- Step 1: Doctor Check ---');
  await builder.run(['doctor']);

  // 2. Discover and Build
  console.log('\n--- Step 2: Build TS & Native C++ ---');
  // Run build with 'Testing' profile
  await builder.run(['build', 'Testing']);

  // 3. Create Release (compiles, packages, bundles, signs, manifest, sbom)
  console.log('\n--- Step 3: Run Full Release Generation ---');
  await builder.run(['release', '1.0.0', '402']);

  // 4. Verify release folder
  console.log('\n--- Step 4: Verify Release Integrity ---');
  await builder.run(['verify']);

  // 5. Publish to GitHub
  console.log('\n--- Step 5: Publish Release to GitHub ---');
  await builder.run(['publish', 'v1.0.0-beta']);

  // 6. Clean release
  console.log('\n--- Step 6: Clean Workspace ---');
  await builder.run(['clean']);

  console.log('='.repeat(70));
  console.log('             AEB PIPELINE SIMULATION COMPLETED');
  console.log('='.repeat(70));
}

if (process.argv[1] && process.argv[1].endsWith('BuildPipelineSimulation.ts')) {
  runBuildSimulation().catch(err => {
    console.error('[Simulation Error]', err);
    process.exit(1);
  });
}
