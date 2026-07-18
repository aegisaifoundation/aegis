import crypto from 'crypto';
import fs from 'fs/promises';
import zlib from 'zlib';
export class DigitalSigner {
    privateKey;
    publicKey;
    constructor() {
        // Generate an ephemeral keypair for simulated signing checks
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }
    async signPackage(packagePath) {
        console.log(`[DigitalSigner] Signing package: ${packagePath}`);
        // Read container
        const buffer = await fs.readFile(packagePath);
        const container = JSON.parse(zlib.gunzipSync(buffer).toString());
        // Sign manifest checksum
        const sign = crypto.createSign('SHA256');
        sign.update(container.manifest.checksum);
        const signature = sign.sign(this.privateKey, 'hex');
        // Attach signature
        container.manifest.signature = signature;
        const recompressed = zlib.gzipSync(Buffer.from(JSON.stringify(container, null, 2)));
        await fs.writeFile(packagePath, recompressed);
        console.log(`[DigitalSigner] Signed package saved successfully.`);
        return signature;
    }
    async verifyPackage(packagePath) {
        try {
            const buffer = await fs.readFile(packagePath);
            const container = JSON.parse(zlib.gunzipSync(buffer).toString());
            const signature = container.manifest.signature;
            if (!signature)
                return false;
            const verify = crypto.createVerify('SHA256');
            verify.update(container.manifest.checksum);
            return verify.verify(this.publicKey, signature, 'hex');
        }
        catch {
            return false;
        }
    }
}
