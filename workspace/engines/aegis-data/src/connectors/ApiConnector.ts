import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import crypto from 'crypto';

export class ApiConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'API';
  private connected = false;
  private endpoint = '';
  private encryptedApiKey = '';
  private encryptionKey: Buffer;

  constructor(id: string) {
    this.id = id;
    this.encryptionKey = crypto.randomBytes(32);
  }

  async connect(config: { endpoint: string; apiKey?: string }): Promise<void> {
    if (!config.endpoint) {
      throw new Error('API endpoint must be specified');
    }
    this.endpoint = config.endpoint;
    if (config.apiKey) {
      this.encryptCredentials(config.apiKey);
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.encryptedApiKey = '';
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');

    // Simulate API HTTP call
    const decryptedKey = this.decryptCredentials();
    return [
      {
        id: `api-response-1`,
        content: `Raw text payload retrieved from API endpoint: ${this.endpoint}. Log status is fine.`,
        metadata: {
          endpoint: this.endpoint,
          hasApiKey: decryptedKey.length > 0,
          timestamp: new Date().toISOString()
        }
      }
    ];
  }

  async validate(): Promise<boolean> {
    return this.connected && this.endpoint.length > 0;
  }

  async watch(onChange: (event: any) => void): Promise<void> {}

  async metadata(): Promise<Record<string, any>> {
    return {
      connected: this.connected,
      endpoint: this.endpoint
    };
  }

  async statistics(): Promise<Record<string, any>> {
    return {
      endpoint: this.endpoint,
      connected: this.connected
    };
  }

  private encryptCredentials(secret: string): void {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.encryptedApiKey = iv.toString('hex') + ':' + encrypted;
  }

  private decryptCredentials(): string {
    if (!this.encryptedApiKey) return '';
    try {
      const parts = this.encryptedApiKey.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return '';
    }
  }
}
