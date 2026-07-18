import fs from 'fs/promises';
import path from 'path';
export class SbomGenerator {
    async generateSbom(packages, packageChecksums, targetDir, format = 'SPDX') {
        console.log(`[SbomGenerator] Compiling Software Bill of Materials (SBOM) in ${format} format`);
        const components = packages.map(pkg => ({
            name: pkg.name,
            version: pkg.version,
            license: 'Apache-2.0',
            hash: packageChecksums[pkg.id] || 'sha256:unknown',
            supplier: 'AEGIS AI Foundation',
            dependencies: pkg.dependencies
        }));
        const sbom = {
            format,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            components
        };
        await fs.mkdir(targetDir, { recursive: true });
        const sbomPath = path.join(targetDir, `SBOM.json`);
        await fs.writeFile(sbomPath, JSON.stringify(sbom, null, 2), 'utf8');
        console.log(`[SbomGenerator] SBOM saved to: ${sbomPath}`);
        return sbomPath;
    }
}
