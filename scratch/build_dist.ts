import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function copyFolderSync(from: string, to: string) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

function buildEngineDist(engineFolder: string) {
  const srcDir = path.resolve(repoRoot, 'packages', engineFolder);
  const destDir = path.resolve(repoRoot, 'engines', engineFolder);
  
  console.log(`[Builder] Preparing distribution for ${engineFolder}...`);
  fs.mkdirSync(destDir, { recursive: true });
  
  // Copy engine.json
  const manifestSrc = path.join(srcDir, 'engine.json');
  const manifestDest = path.join(destDir, 'engine.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log(`[Builder] Copied engine.json manifest.`);
  } else {
    console.warn(`[Builder] Manifest not found at ${manifestSrc}`);
  }
  
  // Copy dist folder
  const distSrc = path.join(srcDir, 'dist');
  const distDest = path.join(destDir, 'dist');
  if (fs.existsSync(distSrc)) {
    copyFolderSync(distSrc, distDest);
    console.log(`[Builder] Copied dist/ compiled files.`);
  } else {
    console.warn(`[Builder] Compiled folder not found at ${distSrc}`);
  }
}

function main() {
  console.log('=== AEGIS Local Distribution Builder ===');
  
  // Ensure engines directory exists
  const enginesDir = path.resolve(repoRoot, 'engines');
  if (fs.existsSync(enginesDir)) {
    fs.rmSync(enginesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(enginesDir, { recursive: true });
  
  // Build each pluggable engine
  buildEngineDist('aegis-agent');
  buildEngineDist('aegis-memory');
  buildEngineDist('aegis-api');
  
  console.log('=== Local Distribution Built Successfully ===');
}

main();
