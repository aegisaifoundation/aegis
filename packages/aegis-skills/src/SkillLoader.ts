import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Skill } from './Skill.js';
import { skillRegistry } from './SkillRegistry.js';
import { SkillState } from './SkillState.js';
import { skillPermissionManager } from './SkillPermissionManager.js';
import { SkillContext, Logger } from './SkillContext.js';
import { eventBus, configurationManager, workspaceManager, serviceRegistry } from '@aegis/runtime';
import { toolRegistry } from '@aegis/tools';
import { providerManager } from '@aegis/providers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SkillLoader {
  constructor() {
    skillRegistry.setContextCreator((name) => this.createContext(name));
  }

  private getAegisCoreRoot(): string {
    let current = __dirname;
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson) && !current.includes('node_modules')) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === '@aegis/skills') {
            return current;
          }
        } catch (e) {
          // ignore
        }
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
    let cwd = process.cwd();
    const nmIndex = cwd.indexOf('node_modules');
    if (nmIndex !== -1) {
      cwd = cwd.substring(0, nmIndex);
    }
    if (fs.existsSync(path.resolve(cwd, 'aegis/skills/package.json'))) {
      return path.resolve(cwd, '@aegis/skills');
    }
    return cwd;
  }

  getWorkspaceRoot(): string {
    return path.dirname(this.getAegisCoreRoot());
  }

  getSkillsDir(): string {
    const wsRoot = this.getWorkspaceRoot();
    return path.resolve(wsRoot, 'skills');
  }

  async loadSkill(skillPath: string): Promise<Skill> {
    const skillsDir = this.getSkillsDir();
    const skillDir = path.resolve(skillsDir, skillPath);

    if (!fs.existsSync(skillDir)) {
      throw new Error(`Skill directory not found: ${skillDir}`);
    }

    const metadataPath = path.join(skillDir, 'skill.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`skill.json not found in ${skillDir}`);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    let permissions: string[] = [];
    const permissionsPath = path.join(skillDir, 'permissions.json');
    if (fs.existsSync(permissionsPath)) {
      const permsData = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
      if (Array.isArray(permsData.permissions)) {
        permissions = permsData.permissions;
      }
    }

    if (!skillPermissionManager.validate(permissions)) {
      throw new Error(`Permission validation failed for skill ${metadata.name}`);
    }

    const isCompiled = import.meta.url.includes('/dist/');
    const entryFile = metadata.entry || 'index.ts';
    let entryName = entryFile;
    if (isCompiled && entryFile.endsWith('.ts')) {
      entryName = entryFile.replace(/\.ts$/, '.js');
    } else if (!isCompiled && entryFile.endsWith('.js')) {
      entryName = entryFile.replace(/\.js$/, '.ts');
    }

    let indexPath = path.join(skillDir, entryName);
    if (!fs.existsSync(indexPath)) {
      const fallbackName = entryName.endsWith('.ts') ? entryName.replace(/\.ts$/, '.js') : entryName.replace(/\.js$/, '.ts');
      const fallbackPath = path.join(skillDir, fallbackName);
      if (fs.existsSync(fallbackPath)) {
        indexPath = fallbackPath;
      }
    }

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Entry file (index.ts/index.js) not found in ${skillDir}`);
    }

    const fileUrl = `${pathToFileURL(indexPath).href}?t=${Date.now()}`;
    const module = await import(fileUrl);
    const manifest = module.default;

    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Invalid metadata format in skill.json');
    }
    if (!metadata.name || typeof metadata.name !== 'string' || metadata.name.trim() === '') {
      throw new Error('Skill metadata is missing a valid "name" field.');
    }
    if (!manifest) {
      throw new Error(`Skill package at ${indexPath} does not export default manifest.`);
    }
    if (manifest.name !== metadata.name) {
      throw new Error(`Skill name mismatch: manifest has '${manifest.name}' but skill.json has '${metadata.name}'`);
    }
    if (typeof manifest.execute !== 'function') {
      throw new Error(`Skill package at ${indexPath} does not export a default execute function.`);
    }

    const skill: Skill = {
      name: manifest.name,
      description: manifest.description || metadata.description || '',
      category: metadata.category || 'shared',
      version: metadata.version || '1.0.0',
      permissions,
      entryPath: indexPath,
      skillPath,
      execute: manifest.execute,
      initialize: manifest.initialize,
      shutdown: manifest.shutdown,
      ...manifest
    };

    skillRegistry.register(skill);
    return skill;
  }

  createContext(name: string): SkillContext {
    const logger: Logger = {
      info: (message: string, context?: any) => eventBus.emit('log', { level: 'INFO', message, context }),
      debug: (message: string, context?: any) => eventBus.emit('log', { level: 'DEBUG', message, context }),
      warn: (message: string, context?: any) => eventBus.emit('log', { level: 'WARN', message, context }),
      error: (message: string, context?: any) => eventBus.emit('log', { level: 'ERROR', message, context }),
    };

    return {
      services: {
        getEventBus: () => eventBus,
        getConfigurationManager: () => configurationManager,
        getToolRegistry: () => toolRegistry,
        getCommandRegistry: () => serviceRegistry.get('commandRegistry'),
        getModelProvider: () => providerManager,
        getWorkspacePath: () => workspaceManager.getWorkspacePath(),
        getSkillRegistry: () => skillRegistry,
        getLogger: () => logger
      },
      config: configurationManager.getRuntimeConfig().skills?.[name] || {}
    };
  }

  async initializeSkill(name: string): Promise<void> {
    const skill = skillRegistry.get(name);
    if (!skill) {
      throw new Error(`Skill ${name} not found in registry.`);
    }

    skillRegistry.setSkillState(name, SkillState.INITIALIZING);

    try {
      if (typeof skill.initialize === 'function') {
        const context = this.createContext(name);
        await skill.initialize(context);
      }
      skillRegistry.setSkillState(name, SkillState.ACTIVE);
      eventBus.emit('skill_loaded', { name, version: skill.version });
    } catch (err: any) {
      skillRegistry.setSkillState(name, SkillState.FAILED);
      eventBus.emit('skill_failed', { name, error: err.message });
      console.error(`[SkillSystem] Failed to initialize skill ${name}: ${err.message}`);
    }
  }

  async shutdownSkill(name: string): Promise<void> {
    const skill = skillRegistry.get(name);
    if (!skill) {
      return;
    }

    try {
      if (typeof skill.shutdown === 'function') {
        const context = this.createContext(name);
        await skill.shutdown(context);
      }
      skillRegistry.setSkillState(name, SkillState.UNLOADED);
      skillRegistry.unregister(name);
    } catch (err: any) {
      skillRegistry.setSkillState(name, SkillState.FAILED);
      eventBus.emit('skill_failed', { name, error: `Shutdown error: ${err.message}` });
      console.error(`[SkillSystem] Failed to shutdown skill ${name}: ${err.message}`);
    }
  }
}

export const skillLoader = new SkillLoader();
