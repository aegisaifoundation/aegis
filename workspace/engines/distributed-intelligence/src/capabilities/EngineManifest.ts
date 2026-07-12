import fs from 'fs';
import { Manifest } from '../models/Manifest.js';

export class EngineManifest {
  static load(manifestPath: string): Manifest {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`EngineManifest: File does not exist at "${manifestPath}"`);
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);
      
      return {
        name: manifest.name ?? 'Distributed Intelligence Engine',
        version: manifest.version ?? '1.0.0',
        buildDate: manifest.buildDate ?? new Date().toISOString(),
        protocolVersion: manifest.protocolVersion ?? '1.0.0',
        modules: manifest.modules ?? [],
        capabilities: manifest.capabilities ?? {},
        dependencies: manifest.dependencies ?? {},
        supportedPlatforms: manifest.supportedPlatforms ?? []
      };
    } catch (e: any) {
      throw new Error(`EngineManifest: Failed to parse manifest file: ${e.message}`);
    }
  }
}
export default EngineManifest;
