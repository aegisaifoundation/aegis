#!/usr/bin/env node
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const homedir = process.env.HOME || process.env.USERPROFILE || '.';
const aegisDir = join(homedir, '.aegis');
const configPath = join(aegisDir, 'config.json');

function ensureConfigDir() {
  if (!existsSync(aegisDir)) mkdirSync(aegisDir, { recursive: true });
}

function loadConfig() {
  try {
    if (!existsSync(configPath)) return {};
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveConfig(cfg) {
  ensureConfigDir();
  writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

async function configureFlow() {
  const cfg = loadConfig();
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentType',
      message: 'Which agent type would you like to configure?',
      choices: ['Hospital Main Agent', 'Doctor Agent', 'Laboratory Agent', 'Pharmacy Agent', 'Reception Agent', 'Security Agent', 'Administrative Agent', 'Research Agent', 'Custom']
    },
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent display name (optional)',
      when: () => true
    }
  ]);
  cfg.installed = true;
  cfg.agentType = answers.agentType;
  if (answers.agentName) cfg.agentName = answers.agentName;
  saveConfig(cfg);
  console.log('Configuration saved to', configPath);
}

async function interactiveFlow() {
  const cfg = loadConfig();
  if (!cfg.installed) {
    console.log('AEGIS is not configured yet. Run `aegis configure` or run the installer script first.');
    process.exit(1);
  }

  const answer = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'AEGIS — Select action',
    choices: ['Configure', 'Show Identity (soul.md)', 'Exit']
  }]);

  if (answer.action === 'Configure') {
    await configureFlow();
    return interactiveFlow();
  }

  if (answer.action === 'Show Identity (soul.md)') {
    const soulPath = join(aegisDir, 'soul.md');
    if (!existsSync(soulPath)) {
      writeFileSync(soulPath, `# Soul\n\nAgent: ${cfg.agentName || cfg.agentType || 'unspecified'}\n`);
    }
    console.log('\n--- soul.md ---\n');
    console.log(readFileSync(soulPath, 'utf8'));
    console.log('\n---------------\n');
    return interactiveFlow();
  }

  process.exit(0);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === 'configure') {
    await configureFlow();
    return;
  }

  if (cmd === 'install') {
    console.log('Installer was not run. Please use the repository install script to perform installation.');
    return;
  }

  if (cmd === 'uninstall') {
    console.log('Uninstall will remove local configuration but not the global CLI link.');
    if (existsSync(configPath)) {
      writeFileSync(configPath, '{}');
      console.log('Local configuration cleared:', configPath);
    } else {
      console.log('No local configuration found.');
    }
    return;
  }

  // default interactive UI
  await interactiveFlow();
}

main().catch((err) => {
  console.error('AEGIS CLI error:', err);
  process.exit(1);
});
