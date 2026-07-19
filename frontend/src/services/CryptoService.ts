import crypto from 'crypto';

export class CryptoService {
  private static derivedKey: Buffer;
  private static fallbackKey: Buffer | undefined;
  private static defaultKey: Buffer | undefined;

  private static get ENCRYPTION_KEY(): string {
    return process.env.DIARY_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me-32chars!!';
  }

  // Pre-compute the keys at module load to save 150-600ms per request during Vercel cold starts
  private static initKeys() {
    if (!this.derivedKey) {
      this.derivedKey = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      
      if (process.env.JWT_SECRET && process.env.JWT_SECRET !== this.ENCRYPTION_KEY) {
        this.fallbackKey = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);
      }

      const defaultSecret = 'default-key-change-me-32chars!!';
      if (defaultSecret !== this.ENCRYPTION_KEY && defaultSecret !== process.env.JWT_SECRET) {
        this.defaultKey = crypto.scryptSync(defaultSecret, 'salt', 32);
      }
    }
  }

  static encrypt(text: string): { encrypted: string; iv: string } {
    this.initKeys();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.derivedKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      encrypted: encrypted + ':' + authTag,
      iv: iv.toString('hex'),
    };
  }

  static decrypt(encryptedText: string, ivHex: string): string {
    this.initKeys();
    const [encrypted, authTag] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    // 1. Try with primary key
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.derivedKey, iv);
      decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
      let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // 2. Fallback to JWT_SECRET key
      if (this.fallbackKey) {
        try {
          const decipher = crypto.createDecipheriv('aes-256-gcm', this.fallbackKey, iv);
          decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
          let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        } catch (fallbackErr) {}
      }

      // 3. Fallback to default key
      if (this.defaultKey) {
        try {
          const decipher = crypto.createDecipheriv('aes-256-gcm', this.defaultKey, iv);
          decipher.setAuthTag(Buffer.from(authTag!, 'hex'));
          let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        } catch (defErr) {}
      }

      throw new Error('Failed to decrypt entry. All key attempts failed.');
    }
  }
}
