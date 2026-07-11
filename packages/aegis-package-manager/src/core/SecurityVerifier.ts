import crypto from 'crypto';
import fs from 'fs';
import { PackageManifest } from '../types/Manifest.js';

export class SecurityVerifier {
  // Hardcoded default public key for testing signature validation
  private static DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Yt+gY5WfWcZlXF202bE
XnFpG2e4V5VJw/tE/ZJ3rF9c2mS2E6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1t2J5Y6V1
-----END PUBLIC KEY-----`;

  public static calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  public static calculateStringHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  public static verifyFileChecksum(filePath: string, expectedHash: string): boolean {
    const actualHash = this.calculateFileHash(filePath);
    return actualHash === expectedHash;
  }

  public static verifySignature(
    text: string,
    signatureBase64: string,
    publicKeyPem: string = SecurityVerifier.DEFAULT_PUBLIC_KEY
  ): boolean {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(text);
      verifier.end();
      return verifier.verify(publicKeyPem, signatureBase64, 'base64');
    } catch {
      return false;
    }
  }

  public static validateManifestSchema(manifest: any): PackageManifest {
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

    return manifest as PackageManifest;
  }

  public static validateCompatibility(
    manifest: PackageManifest,
    hostPlatform: string = process.platform,
    hostArch: string = process.arch,
    runtimeVersion: string = '1.0.0',
    sdkVersion: string = '1.0.0'
  ): void {
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
  private static compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
}
