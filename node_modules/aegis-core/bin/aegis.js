#!/usr/bin/env node

import inquirer from 'inquirer';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync
} from 'fs';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import os from 'os';

const homedir = process.env.HOME || process.env.USERPROFILE || os.homedir();

const aegisDir = join(homedir, '.aegis');
const configPath = join(aegisDir, 'config.json');

const rootDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);

const distEntry = join(rootDir, 'dist', 'index.js');
const srcEntry = join(rootDir, 'src', 'index.tsx');

// CONFIG

function ensureConfigDir() {

  if (!existsSync(aegisDir)) {

    mkdirSync(aegisDir, {
      recursive: true
    });

  }
}

function loadConfig() {

  try {

    if (!existsSync(configPath)) {
      return {};
    }

    return JSON.parse(
      readFileSync(configPath, 'utf8')
    );

  } catch {

    return {};

  }
}

function saveConfig(cfg) {

  ensureConfigDir();

  writeFileSync(
    configPath,
    JSON.stringify(cfg, null, 2)
  );
}

// CONFIGURE FLOW

async function configureFlow() {

  const cfg = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentType',
      message: 'Which agent type would you like to configure?',
      choices: [
        'Hospital Main Agent',
        'Doctor Agent',
        'Laboratory Agent',
        'Pharmacy Agent',
        'Reception Agent',
        'Security Agent',
        'Administrative Agent',
        'Research Agent',
        'Custom'
      ]
    },
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent display name (optional)'
    }
  ]);

  cfg.installed = true;
  cfg.agentType = answers.agentType;

  if (answers.agentName) {
    cfg.agentName = answers.agentName;
  }

  saveConfig(cfg);

  console.log('[AEGIS] Configuration saved.');
  console.log(configPath);
}

// INTERACTIVE FLOW


async function interactiveFlow() {

  const cfg = loadConfig();

  if (!cfg.installed) {

    console.log(
      '[AEGIS] Not configured yet. Run `aegis configure`.'
    );

    process.exit(1);
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'AEGIS — Select action',
      choices: [
        'Configure',
        'Show Identity (soul.md)',
        'Open TUI',
        'Exit'
      ]
    }
  ]);

  
  // CONFIGURE
  

  if (answer.action === 'Configure') {

    await configureFlow();

    return interactiveFlow();
  }

  
  // SHOW SOUL
  
  if (answer.action === 'Show Identity (soul.md)') {

    const soulPath = join(aegisDir, 'soul.md');

    if (!existsSync(soulPath)) {

      writeFileSync(
        soulPath,
        `# Soul\n\nAgent: ${
          cfg.agentName ||
          cfg.agentType ||
          'unspecified'
        }\n`
      );
    }

    console.log('\n--- soul.md ---\n');

    console.log(
      readFileSync(soulPath, 'utf8')
    );

    console.log('\n---------------\n');

    return interactiveFlow();
  }

  
  // OPEN TUI
  

  if (answer.action === 'Open TUI') {

    await startTui();

    return;
  }

  process.exit(0);
}


// SPAWN NODE


function spawnNode(entry) {

  return new Promise((resolve) => {

    const child = spawn(
      process.execPath,
      [entry],
      {
        stdio: 'inherit',
        cwd: rootDir,
        shell: false
      }
    );

    child.on('exit', (code) => {

      resolve(code ?? 0);

    });

  });
}


// START TUI


async function startTui() {

  const cfg = loadConfig();

  if (!cfg.installed) {

    console.log(
      '[AEGIS] Not configured yet.'
    );

    process.exit(1);
  }

  if (existsSync(distEntry)) {

    const code = await spawnNode(distEntry);

    process.exit(code);
  }

  if (existsSync(srcEntry)) {

    console.log(
      '[AEGIS] Build not found.'
    );

    console.log(
      'Run `npm run build`.'
    );

    process.exit(1);
  }

  console.error(
    '[AEGIS] Missing dist/index.js'
  );

  process.exit(1);
}


// UNINSTALL


async function uninstallAegis() {

  console.log('[AEGIS] Starting uninstall...');

 
  // Remove npm global link
 

  try {

    console.log(
      '[AEGIS] Removing global CLI...'
    );

    execSync(
      'npm unlink -g aegis',
      {
        stdio: 'inherit',
        shell: true
      }
    );

  } catch {

    console.log(
      '[AEGIS] Failed to unlink global CLI.'
    );

  }

 
  // Remove environment variable
  

  try {

    execSync(
      'reg delete HKCU\\Environment /F /V AEGIS_HOME',
      {
        stdio: 'ignore',
        shell: true
      }
    );

    console.log(
      '[AEGIS] Removed AEGIS_HOME'
    );

  } catch {

    console.log(
      '[AEGIS] Failed to remove AEGIS_HOME'
    );

  }

  
  // Remove ~/.aegis
  

  try {

    if (existsSync(aegisDir)) {

      rmSync(aegisDir, {
        recursive: true,
        force: true
      });

      console.log(
        '[AEGIS] Removed ~/.aegis'
      );
    }

  } catch {

    console.log(
      '[AEGIS] Failed to remove ~/.aegis'
    );

  }

  
  // Remove ~/AEGIS
  

  try {

    const installDir = join(
      homedir,
      'AEGIS'
    );

    if (existsSync(installDir)) {

      rmSync(installDir, {
        recursive: true,
        force: true
      });

      console.log(
        '[AEGIS] Removed ~/AEGIS'
      );
    }

  } catch {

    console.log(
      '[AEGIS] Failed to remove ~/AEGIS'
    );

  }

  console.log('');
  console.log(
    '[AEGIS] Uninstall complete.'
  );

  console.log(
    '[AEGIS] Restart terminal to refresh environment.'
  );
}


// MAIN


async function main() {

  const argv = process.argv.slice(2);

  const cmd = argv[0];

  
  // CONFIGURE
  

  if (cmd === 'configure') {

    await configureFlow();

    return;
  }


  // INSTALL
  

  if (cmd === 'install') {

    console.log(
      '[AEGIS] Use install.ps1 instead.'
    );

    return;
  }

  
  // UNINSTALL


  if (cmd === 'uninstall') {

    await uninstallAegis();

    return;
  }

 
  // START
 

  if (
    cmd === 'tui' ||
    cmd === 'start' ||
    cmd === undefined
  ) {

    await startTui();

    return;
  }

 
  // UNKNOWN


  console.log(
    `Unknown command: ${cmd}`
  );

  console.log('');
  console.log(
    'Available commands:'
  );

  console.log('  aegis');
  console.log('  aegis configure');
  console.log('  aegis uninstall');

  process.exit(1);
}

main().catch((err) => {

  console.error(
    '[AEGIS] CLI error:',
    err
  );

  process.exit(1);

});