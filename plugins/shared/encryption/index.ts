import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import crypto from 'crypto';

export default {
  name: "encryption",
  category: "shared",
  description: "Security crypt tools: AES encryption/decryption helper methods",
  version: "1.0.0",

  async initialize(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Encryption plugin initialized.");
  },

  async shutdown(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Encryption plugin shut down.");
  },

  encrypt(text: string, keyString: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(keyString, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  decrypt(encryptedText: string, keyString: string): string {
    const algorithm = 'aes-256-cbc';
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encrypted = textParts.join(':');
    const key = crypto.scryptSync(keyString, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
};
