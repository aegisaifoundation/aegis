import fs from 'fs/promises';
import path from 'path';
import { PlatformManifest, PreReleaseChannel } from '../types/index.js';

export class ManifestGenerator {
  async generateManifest(
    version: string,
    buildNumber: string,
    channel: PreReleaseChannel,
    packageChecksums: Record<string, string>,
    bundles: Record<string, string[]>,
    targetDir: string
  ): Promise<string> {
    console.log(`[ManifestGenerator] Generating release manifest.json`);

    const manifest: PlatformManifest = {
      platformVersion: version,
      buildNumber,
      releaseChannel: channel,
      supportedRuntimeVersion: '>=1.0.0',
      supportedNodeVersion: '>=20.0.0',
      minInstallerVersion: '1.0.0',
      releaseDate: new Date().toISOString(),
      packages: packageChecksums,
      bundles
    };

    await fs.mkdir(targetDir, { recursive: true });
    const manifestPath = path.join(targetDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`[ManifestGenerator] Manifest saved to: ${manifestPath}`);
    return manifestPath;
  }
}
