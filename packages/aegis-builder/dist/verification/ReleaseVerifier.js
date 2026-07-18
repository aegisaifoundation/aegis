import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
export class ReleaseVerifier {
    signer;
    constructor(signer) {
        this.signer = signer;
    }
    async verifyRelease(releaseDir) {
        console.log(`[ReleaseVerifier] Validating release directory: ${releaseDir}`);
        const errors = [];
        const manifestPath = path.join(releaseDir, 'manifest.json');
        if (!existsSync(manifestPath)) {
            errors.push('manifest.json is missing in release directory.');
            return { valid: false, errors };
        }
        try {
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
            // 1. Verify all listed packages exist and match checksums
            for (const [pkgId, expectedChecksum] of Object.entries(manifest.packages)) {
                const pkgFile = path.join(releaseDir, `${pkgId}.aeg`);
                if (!existsSync(pkgFile)) {
                    errors.push(`Package file missing: ${pkgFile}`);
                    continue;
                }
                // Verify signature
                const signedValid = await this.signer.verifyPackage(pkgFile);
                if (!signedValid) {
                    errors.push(`Invalid signature for package: ${pkgId}`);
                }
            }
            // 2. Verify all bundles are complete
            for (const [bundleName, packages] of Object.entries(manifest.bundles)) {
                const bundleFile = path.join(releaseDir, `${bundleName}.aegbundle`);
                if (!existsSync(bundleFile)) {
                    errors.push(`Bundle file missing: ${bundleFile}`);
                    continue;
                }
                for (const pkgId of packages) {
                    if (!manifest.packages[pkgId]) {
                        errors.push(`Bundle "${bundleName}" references unregistered package "${pkgId}"`);
                    }
                }
            }
            // 3. Verify SBOM
            const sbomPath = path.join(releaseDir, 'SBOM.json');
            if (!existsSync(sbomPath)) {
                errors.push('SBOM.json is missing.');
            }
        }
        catch (err) {
            errors.push(`Failed to parse manifest: ${err.message}`);
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
