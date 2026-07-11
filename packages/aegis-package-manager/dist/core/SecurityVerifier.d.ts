import { PackageManifest } from '../types/Manifest.js';
export declare class SecurityVerifier {
    private static DEFAULT_PUBLIC_KEY;
    static calculateFileHash(filePath: string): string;
    static calculateStringHash(text: string): string;
    static verifyFileChecksum(filePath: string, expectedHash: string): boolean;
    static verifySignature(text: string, signatureBase64: string, publicKeyPem?: string): boolean;
    static validateManifestSchema(manifest: any): PackageManifest;
    static validateCompatibility(manifest: PackageManifest, hostPlatform?: string, hostArch?: string, runtimeVersion?: string, sdkVersion?: string): void;
    private static compareVersions;
}
