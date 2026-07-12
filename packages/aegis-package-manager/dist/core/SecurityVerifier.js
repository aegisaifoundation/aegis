import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class SecurityVerifier {
    // Hardcoded default public key for testing signature validation
    static DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Yt+gY5WfWcZlXF202bE
XnFpG2e4V5VJw/tE/ZJ3rF9c2mS2E6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
-----END PUBLIC KEY-----`;
    static calculateFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }
    static calculateStringHash(text) {
        return crypto.createHash('sha256').update(text).digest('hex');
    }
    static verifyFileChecksum(filePath, expectedHash) {
        const actualHash = this.calculateFileHash(filePath);
        return actualHash === expectedHash;
    }
    static verifySignature(text, signatureBase64, publicKeyPem) {
        try {
            let key = publicKeyPem;
            if (!key) {
                const searchPaths = [
                    process.env.AEGIS_PUBLIC_KEY_PATH,
                    path.resolve(process.cwd(), 'config/keys/public.pem'),
                    path.resolve(process.cwd(), 'keys/public.pem'),
                    path.resolve(process.cwd(), 'packages/aegis-runtime/src/config/keys/public.pem'),
                    path.resolve(__dirname, '../../../../aegis-runtime/src/config/keys/public.pem'),
                    path.resolve(__dirname, '../../../../packages/aegis-runtime/src/config/keys/public.pem'),
                    path.resolve(__dirname, '../config/keys/public.pem'),
                    path.resolve(__dirname, '../../config/keys/public.pem'),
                    path.resolve(__dirname, '../../../config/keys/public.pem')
                ];
                // Robust climbing search for config/keys/public.pem
                let current = process.cwd();
                for (let i = 0; i < 5; i++) {
                    const p = path.resolve(current, 'config/keys/public.pem');
                    if (!searchPaths.includes(p)) {
                        searchPaths.push(p);
                    }
                    const parent = path.dirname(current);
                    if (parent === current)
                        break;
                    current = parent;
                }
                for (const p of searchPaths) {
                    if (p && fs.existsSync(p)) {
                        try {
                            key = fs.readFileSync(p, 'utf8');
                            break;
                        }
                        catch { }
                    }
                }
            }
            if (!key) {
                key = SecurityVerifier.DEFAULT_PUBLIC_KEY;
            }
            const verifier = crypto.createVerify('SHA256');
            verifier.update(text);
            verifier.end();
            return verifier.verify(key, signatureBase64, 'base64');
        }
        catch {
            return false;
        }
    }
    static validateManifestSchema(manifest) {
        if (!manifest.id || typeof manifest.id !== 'string') {
            throw new Error('Invalid manifest: missing or invalid "id" field');
        }
        if (!manifest.name || typeof manifest.name !== 'string') {
            throw new Error('Invalid manifest: missing or invalid "name" field');
        }
        if (!manifest.version || typeof manifest.version !== 'string') {
            throw new Error('Invalid manifest: missing or invalid "version" field');
        }
        if (!manifest.type || typeof manifest.type !== 'string') {
            throw new Error('Invalid manifest: missing or invalid "type" field');
        }
        const validTypes = [
            'Runtime', 'Engine', 'Skill', 'Tool', 'Plugin', 'Model',
            'Application', 'Template', 'Configuration', 'Bundle'
        ];
        if (!validTypes.includes(manifest.type)) {
            throw new Error(`Invalid manifest: unsupported package type "${manifest.type}"`);
        }
        return manifest;
    }
    static validateCompatibility(manifest, hostPlatform = process.platform, hostArch = process.arch, runtimeVersion = '1.0.0', sdkVersion = '1.0.0') {
        // 1. Platform checks
        if (manifest.supportedPlatforms && manifest.supportedPlatforms.length > 0) {
            if (!manifest.supportedPlatforms.includes(hostPlatform)) {
                throw new Error(`Incompatible platform: Package supports [${manifest.supportedPlatforms.join(', ')}] but host is "${hostPlatform}"`);
            }
        }
        // 2. Architecture checks
        if (manifest.supportedArchitectures && manifest.supportedArchitectures.length > 0) {
            if (!manifest.supportedArchitectures.includes(hostArch)) {
                throw new Error(`Incompatible architecture: Package supports [${manifest.supportedArchitectures.join(', ')}] but host is "${hostArch}"`);
            }
        }
        // 3. Runtime Version constraint validation (Simple semver major check or equality fallback)
        if (manifest.runtimeVersionConstraint) {
            const { min, max } = manifest.runtimeVersionConstraint;
            if (min && this.compareVersions(runtimeVersion, min) < 0) {
                throw new Error(`Incompatible runtime version: Host version "${runtimeVersion}" is below minimum required "${min}"`);
            }
            if (max && this.compareVersions(runtimeVersion, max) > 0) {
                throw new Error(`Incompatible runtime version: Host version "${runtimeVersion}" exceeds maximum required "${max}"`);
            }
        }
        // 4. SDK version validation
        if (manifest.sdkVersion) {
            // The minor/major must match for safety
            if (this.compareVersions(sdkVersion, manifest.sdkVersion) < 0) {
                throw new Error(`Incompatible SDK: Host SDK version "${sdkVersion}" is below required "${manifest.sdkVersion}"`);
            }
        }
    }
    // Simple helper to compare semver-like strings (major.minor.patch)
    static compareVersions(v1, v2) {
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2)
                return 1;
            if (n1 < n2)
                return -1;
        }
        return 0;
    }
}
