import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
export class PackageBuilder {
    async buildPackage(pkg, targetDir) {
        console.log(`[PackageBuilder] Packaging engine: ${pkg.id} into tar/zip format`);
        // 1. Gather files from pkg directory
        const payload = {};
        const relativePaths = [];
        const distDir = path.join(pkg.directory, 'dist');
        const pythonDir = path.join(pkg.directory, 'python');
        const engineJson = path.join(pkg.directory, 'engine.json');
        // Helper to recursively collect files
        const collectFiles = async (dir, base) => {
            if (!existsSync(dir))
                return;
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(base, fullPath).replace(/\\/g, '/');
                if (entry.isDirectory()) {
                    await collectFiles(fullPath, base);
                }
                else {
                    const content = await fs.readFile(fullPath, 'utf8');
                    payload[relPath] = content;
                    relativePaths.push(relPath);
                }
            }
        };
        await collectFiles(distDir, pkg.directory);
        await collectFiles(pythonDir, pkg.directory);
        if (existsSync(engineJson)) {
            const content = await fs.readFile(engineJson, 'utf8');
            payload['engine.json'] = content;
            relativePaths.push('engine.json');
        }
        // 2. Generate Package Manifest
        const rawPayload = JSON.stringify(payload);
        const checksum = crypto.createHash('sha256').update(rawPayload).digest('hex');
        const manifest = {
            id: pkg.id,
            name: pkg.name,
            version: pkg.version,
            publisher: 'AEGIS AI Foundation',
            dependencies: pkg.dependencies,
            capabilities: pkg.capabilities,
            permissions: pkg.permissions,
            checksum
        };
        // 3. Compress container (representing standard physical ZIP logically)
        const container = {
            manifest,
            files: payload
        };
        const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(container, null, 2)));
        await fs.mkdir(targetDir, { recursive: true });
        const outputFilename = path.join(targetDir, `${pkg.id}.aeg`);
        await fs.writeFile(outputFilename, compressed);
        console.log(`[PackageBuilder] Package generated successfully: ${outputFilename} (${compressed.length} bytes)`);
        return outputFilename;
    }
}
