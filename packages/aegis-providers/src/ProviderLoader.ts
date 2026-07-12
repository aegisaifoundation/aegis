import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Provider } from './Provider.js';
import { providerRegistry } from './ProviderRegistry.js';
import { ProviderState } from './ProviderState.js';
import { createProviderContext } from './ProviderContext.js';
import { eventBus } from '@aegis/runtime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProviderLoader {
  private getMonorepoRoot(): string {
    // Walk up from __dirname to find the monorepo root (package.json with name "aegis-monorepo")
    let current = __dirname;
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson) && !current.includes('node_modules')) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-monorepo') {
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
    // Fallback: try process.cwd()
    let cwd = process.cwd();
    const nmIndex = cwd.indexOf('node_modules');
    if (nmIndex !== -1) {
      cwd = cwd.substring(0, nmIndex);
    }
    return cwd;
  }

  getWorkspaceRoot(): string {
    return this.getMonorepoRoot();
  }

  getProvidersDir(): string {
    const wsRoot = this.getWorkspaceRoot();
    return path.resolve(wsRoot, 'providers');
  }

  async discoverProviders(): Promise<string[]> {
    const wsRoot = this.getWorkspaceRoot();
    const providersDir = path.resolve(wsRoot, 'providers');
    if (!fs.existsSync(providersDir)) {
      return [];
    }

    const discovered: string[] = [];

    const scan = (dir: string, depth: number) => {
      if (depth > 2) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(dir, entry.name);
          if (fs.existsSync(path.join(subDir, 'provider.json'))) {
            const relPath = path.relative(providersDir, subDir).replace(/\\/g, '/');
            discovered.push(relPath);
          } else {
            scan(subDir, depth + 1);
          }
        }
      }
    };

    scan(providersDir, 1);
    return discovered;
  }

  async loadProvider(providerPath: string): Promise<Provider> {
    const wsRoot = this.getWorkspaceRoot();
    const sourceProviderDir = path.resolve(wsRoot, 'providers', providerPath);

    const metadataPath = path.join(sourceProviderDir, 'provider.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`provider.json not found in source directory: ${sourceProviderDir}`);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    const providersDir = this.getProvidersDir();
    const targetProviderDir = path.resolve(providersDir, providerPath);

    const isCompiled = import.meta.url.includes('/dist/');
    const entryFile = metadata.entry || 'index.ts';
    let entryName = entryFile;
    if (isCompiled && entryFile.endsWith('.ts')) {
      entryName = entryFile.replace(/\.ts$/, '.js');
    } else if (!isCompiled && entryFile.endsWith('.js')) {
      entryName = entryFile.replace(/\.js$/, '.ts');
    }

    let indexPath = path.join(targetProviderDir, entryName);
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(sourceProviderDir, entryName);
    }

    if (!fs.existsSync(indexPath)) {
      const fallbackName = entryName.endsWith('.ts') ? entryName.replace(/\.ts$/, '.js') : entryName.replace(/\.js$/, '.ts');
      let fallbackPath = path.join(targetProviderDir, fallbackName);
      if (!fs.existsSync(fallbackPath)) {
        fallbackPath = path.join(sourceProviderDir, fallbackName);
      }
      if (fs.existsSync(fallbackPath)) {
        indexPath = fallbackPath;
      }
    }

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Entry file not found in ${targetProviderDir} or ${sourceProviderDir}`);
    }

    const fileUrl = `${pathToFileURL(indexPath).href}?t=${Date.now()}`;
    const module = await import(fileUrl);
    const manifest = module.default;

    if (!manifest) {
      throw new Error(`Provider package at ${indexPath} does not export default.`);
    }

    let providerInstance: Provider;
    if (manifest.provider) {
      providerInstance = manifest.provider;
    } else if (typeof manifest === 'object' && typeof manifest.generate === 'function') {
      providerInstance = manifest;
    } else if (typeof manifest === 'function') {
      providerInstance = new manifest();
    } else {
      throw new Error(`Invalid provider format in ${indexPath}`);
    }

    providerInstance.name = providerInstance.name || metadata.name || providerPath;
    providerInstance.category = providerInstance.category || metadata.category || 'unknown';
    providerInstance.version = providerInstance.version || metadata.version || '1.0.0';

    providerRegistry.register(providerPath, providerInstance);
    providerRegistry.setProviderState(providerPath, ProviderState.DISCOVERED);

    return providerInstance;
  }

  async initializeProvider(providerPath: string): Promise<void> {
    const provider = providerRegistry.get(providerPath);
    if (!provider) {
      throw new Error(`Provider ${providerPath} not loaded`);
    }

    providerRegistry.setProviderState(providerPath, ProviderState.INITIALIZING);
    try {
      const context = createProviderContext(providerPath);
      await provider.initialize(context);
      providerRegistry.setProviderState(providerPath, ProviderState.READY);
      eventBus.emit('provider_initialized', { name: providerPath, version: provider.version });
      eventBus.emit('provider_ready', { name: providerPath });
    } catch (err: any) {
      providerRegistry.setProviderState(providerPath, ProviderState.FAILED);
      eventBus.emit('provider_failed', { name: providerPath, error: err.message });
      console.error(`[ProviderLoader] Failed to initialize provider ${providerPath}:`, err.message);
      throw err;
    }
  }
}

export const providerLoader = new ProviderLoader();
