import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
export class BundleBuilder {
    async buildBundle(spec, packageChecksums, targetDir) {
        console.log(`[BundleBuilder] Packaging installation bundle: ${spec.name}.aegbundle`);
        const manifest = {
            bundleName: spec.name,
            description: spec.description,
            packages: spec.packages.map(pkgId => ({
                id: pkgId,
                checksum: packageChecksums[pkgId] || 'sha256:unknown'
            })),
            timestamp: new Date().toISOString()
        };
        // Compress bundle container
        const container = {
            manifest,
            timestamp: manifest.timestamp
        };
        const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(container, null, 2)));
        await fs.mkdir(targetDir, { recursive: true });
        const outputFilename = path.join(targetDir, `${spec.name}.aegbundle`);
        await fs.writeFile(outputFilename, compressed);
        console.log(`[BundleBuilder] Bundle generated successfully: ${outputFilename} (${compressed.length} bytes)`);
        return outputFilename;
    }
}
