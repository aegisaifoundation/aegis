import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class SignatureSigner {
  private privateKey: string | null = null;
  private publicKey: string | null = null;

  constructor(private keysDir: string) {
    fs.mkdirSync(keysDir, { recursive: true });
    this.initializeKeys();
  }

  public getPublicKeyPem(): string {
    if (!this.publicKey) throw new Error('Public key not initialized');
    return this.publicKey;
  }

  public signText(text: string): string {
    if (!this.privateKey) {
      throw new Error('Private key not available for signing. Ensure keys are generated.');
    }
    const signer = crypto.createSign('SHA256');
    signer.update(text);
    signer.end();
    return signer.sign(this.privateKey, 'base64');
  }

  private initializeKeys(): void {
    const privateKeyPath = path.join(this.keysDir, 'private.pem');
    const publicKeyPath = path.join(this.keysDir, 'public.pem');

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      console.log('[SignatureSigner] Existing PEM cryptographic keypair found and loaded.');
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      return;
    }

    console.log('[SignatureSigner] Keys not found. Generating fresh 2048-bit RSA keypair...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
    fs.writeFileSync(publicKeyPath, publicKey, 'utf8');

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    console.log(`[SignatureSigner] Fresh keypair generated and saved to ${this.keysDir}`);
  }
}
