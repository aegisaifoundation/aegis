import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { EngineRegistry, EngineRegistryEntry } from './types/EngineRegistry.js';
import { RegistryRecovery } from './RegistryRecovery.js';

export interface ValidatedEngine {
  entry: EngineRegistryEntry;
  moduleUrl: string;
  classRef: any;
}

export class RegistryLoader {
  private static getRepositoryRoot(startDir: string): string {
    let current = path.resolve(startDir);
    const seen = new Set<string>();
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-monorepo') {
            return current;
          }
        } catch (e) {}
      }
      const parent = path.dirname(current);
      if (parent === current || seen.has(parent)) {
        break;
      }
      seen.add(current);
      current = parent;
    }
    return process.cwd();
  }

  public static async loadRegistry(context: any): Promise<ValidatedEngine[]> {
    const workspacePath = context.getWorkspacePath();
    const registryPath = path.join(workspacePath, 'registry', 'engines.json');
    const repoRoot = this.getRepositoryRoot(workspacePath);
    const currentApiVersion = context.kernelVersion || '1.0.0';

    let registryData: any = null;

    // 1. Try to load registry
    if (fs.existsSync(registryPath)) {
      try {
        const raw = fs.readFileSync(registryPath, 'utf8');
        registryData = JSON.parse(raw);
      } catch {
        console.warn('[RegistryLoader] Registry engines.json is corrupted.');
      }
    }

    // 2. Trigger Recovery if loading failed
    if (!registryData || !Array.isArray(registryData.engines) || !registryData.version) {
      console.warn('[RegistryLoader] Initiating Registry Recovery from snapshots...');
      registryData = RegistryRecovery.recoverRegistry(registryPath, workspacePath);
    }

    // 3. If still no registryData, return empty (boot with zero engines)
    if (!registryData || !Array.isArray(registryData.engines)) {
      console.error('[RegistryLoader] No registry entries found, and recovery failed.');
      return [];
    }

    // Validate registry version
    if (registryData.version !== '1.0.0') {
      console.warn(`[RegistryLoader] Unsupported registry version: ${registryData.version}. Skipping.`);
      return [];
    }

    const validatedEngines: ValidatedEngine[] = [];
    const seenIds = new Set<string>();
    const seenEntries = new Set<string>();

    for (const entry of registryData.engines) {
      try {
        const e = entry as EngineRegistryEntry;

        // A. Skip if disabled
        if (e.enabled === false) {
          console.log(`[RegistryLoader] Engine ${e.id} is disabled. Skipping.`);
          continue;
        }

        // B. Validate duplicate IDs
        if (seenIds.has(e.id.toLowerCase())) {
          console.warn(`[RegistryLoader] Duplicate engine ID skipped: ${e.id}`);
          continue;
        }
        seenIds.add(e.id.toLowerCase());

        // C. Validate duplicate entrypoint paths
        const entryKey = e.entry.toLowerCase();
        if (seenEntries.has(entryKey)) {
          console.warn(`[RegistryLoader] Duplicate entrypoint path skipped: ${e.entry}`);
          continue;
        }
        seenEntries.add(entryKey);

        // D. Validate manifest existence
        const manifestPath = path.resolve(repoRoot, e.manifest);
        if (!fs.existsSync(manifestPath)) {
          console.warn(`[RegistryLoader] Manifest file not found at ${manifestPath} for engine ${e.id}. Skipping.`);
          continue;
        }

        // E. Validate entrypoint module existence
        const entrypointPath = path.resolve(repoRoot, e.entry);
        if (!fs.existsSync(entrypointPath)) {
          console.warn(`[RegistryLoader] Entry file not found at ${entrypointPath} for engine ${e.id}. Skipping.`);
          continue;
        }

        // F. Validate runtime compatibility (Kernel API constraint)
        if (e.runtimeApi && e.runtimeApi !== currentApiVersion) {
          console.warn(`[RegistryLoader] Engine ${e.id} is incompatible (Target API: ${e.runtimeApi}, Current API: ${currentApiVersion}). Skipping.`);
          continue;
        }

        // G. Dynamic Import and Export Validation (verify entry exports a valid IEngine implementation)
        const moduleUrl = pathToFileURL(entrypointPath).toString();
        const engineModule = await import(moduleUrl);

        let classRef: any = null;
        // Scan exports for a constructable class that implements IEngine
        for (const key of Object.keys(engineModule)) {
          const val = engineModule[key];
          if (typeof val === 'function' && val.prototype) {
            try {
              const inst = new (val as any)();
              if (inst.metadata && inst.metadata.id) {
                classRef = val;
                break;
              }
            } catch (e) {}
          }
        }

        if (!classRef) {
          if (engineModule.default && engineModule.default.metadata) {
            classRef = engineModule.default;
          } else if (engineModule.metadata) {
            classRef = engineModule;
          }
        }

        if (!classRef) {
          console.warn(`[RegistryLoader] No valid IEngine implementation found in exports of ${moduleUrl} for engine ${e.id}. Skipping.`);
          continue;
        }

        validatedEngines.push({
          entry: e,
          moduleUrl,
          classRef
        });
      } catch (err: any) {
        console.error(`[RegistryLoader] Failed to validate registry entry:`, err.message || err);
      }
    }

    return validatedEngines;
  }
}
