import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export class NodeIdentityManager {
    workspaceRoot;
    identityPath;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.identityPath = path.join(this.workspaceRoot, 'identity');
    }
    initialize(name, edition, role) {
        if (!fs.existsSync(this.identityPath)) {
            fs.mkdirSync(this.identityPath, { recursive: true });
        }
        const metadataFile = path.join(this.identityPath, 'identity.json');
        const privateKeyFile = path.join(this.identityPath, 'private.pem');
        const publicKeyFile = path.join(this.identityPath, 'public.pem');
        const certFile = path.join(this.identityPath, 'cert.pem');
        if (fs.existsSync(metadataFile) && fs.existsSync(privateKeyFile) && fs.existsSync(publicKeyFile) && fs.existsSync(certFile)) {
            // Identity already exists, load and return it
            const meta = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
            const privateKey = fs.readFileSync(privateKeyFile, 'utf8');
            const publicKey = fs.readFileSync(publicKeyFile, 'utf8');
            const certificate = fs.readFileSync(certFile, 'utf8');
            return {
                ...meta,
                privateKey,
                publicKey,
                certificate
            };
        }
        // Generate new cryptographic identity
        const uuid = crypto.randomUUID();
        const nodeId = `aegis://${uuid}`;
        const createdAt = new Date().toISOString();
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        // Create a self-signed certificate structure (Base64 metadata + signature)
        const certInfo = {
            issuer: nodeId,
            subject: nodeId,
            validFrom: createdAt,
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10).toISOString(), // 10 years validity
            publicKey
        };
        const certData = JSON.stringify(certInfo);
        const sign = crypto.createSign('SHA256');
        sign.update(certData);
        const signature = sign.sign(privateKey, 'base64');
        const certObj = {
            info: certInfo,
            signature
        };
        const certificate = `-----BEGIN CERTIFICATE-----\n${Buffer.from(JSON.stringify(certObj)).toString('base64')}\n-----END CERTIFICATE-----`;
        const fingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');
        const meta = {
            nodeId,
            name,
            edition,
            role,
            createdAt,
            fingerprint
        };
        // Save to disk
        fs.writeFileSync(metadataFile, JSON.stringify(meta, null, 2), 'utf8');
        fs.writeFileSync(privateKeyFile, privateKey, 'utf8');
        fs.writeFileSync(publicKeyFile, publicKey, 'utf8');
        fs.writeFileSync(certFile, certificate, 'utf8');
        return {
            ...meta,
            privateKey,
            publicKey,
            certificate
        };
    }
    load() {
        const metadataFile = path.join(this.identityPath, 'identity.json');
        const privateKeyFile = path.join(this.identityPath, 'private.pem');
        const publicKeyFile = path.join(this.identityPath, 'public.pem');
        const certFile = path.join(this.identityPath, 'cert.pem');
        if (!fs.existsSync(metadataFile) || !fs.existsSync(privateKeyFile) || !fs.existsSync(publicKeyFile) || !fs.existsSync(certFile)) {
            return null;
        }
        const meta = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        const privateKey = fs.readFileSync(privateKeyFile, 'utf8');
        const publicKey = fs.readFileSync(publicKeyFile, 'utf8');
        const certificate = fs.readFileSync(certFile, 'utf8');
        return {
            ...meta,
            privateKey,
            publicKey,
            certificate
        };
    }
}
//# sourceMappingURL=NodeIdentityManager.js.map