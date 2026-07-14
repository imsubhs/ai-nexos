/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import Redis from "ioredis";

export interface WebhookValidationConfig {
  secretHmac?: string;
  requiresNonce: boolean;
  requiresTimestamp: boolean;
  expirationWindowSeconds: number;
}

export interface WebhookPayload {
  headers: Record<string, string>;
  body: string; // raw body for HMAC
}

export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookValidationError";
  }
}

/**
 * Validates incoming webhooks based on strict security configurations.
 */
export class WebhookValidator {
  
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async validate(payload: WebhookPayload, config: WebhookValidationConfig): Promise<boolean> {
    // 1. Timestamp validation
    let timestamp = 0;
    if (config.requiresTimestamp) {
      const tsHeader = payload.headers['x-automation-timestamp'];
      if (!tsHeader) {
        throw new WebhookValidationError("Missing timestamp header: x-automation-timestamp");
      }
      timestamp = parseInt(tsHeader, 10);
      if (isNaN(timestamp)) {
        throw new WebhookValidationError("Invalid timestamp header format");
      }

      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > config.expirationWindowSeconds) {
        throw new WebhookValidationError(`Timestamp is outside the allowed window of ${config.expirationWindowSeconds} seconds.`);
      }
    }

    // 2. Nonce & Replay protection via Redis SET NX
    if (config.requiresNonce) {
      const nonceHeader = payload.headers['x-automation-nonce'];
      if (!nonceHeader) {
        throw new WebhookValidationError("Missing nonce header: x-automation-nonce");
      }
      
      const nonceKey = `automation:nonce:${nonceHeader}`;
      
      // SET NX with TTL (expiration window) ensures replay protection across distributed workers
      // If SET succeeds (returns "OK"), it's a new nonce. If it fails (returns null), it's a replay.
      const setResult = await this.redis.set(nonceKey, "1", "EX", config.expirationWindowSeconds, "NX");
      
      if (setResult !== "OK") {
        throw new WebhookValidationError("Replay attack detected: nonce has already been used.");
      }
    }

    // 3. HMAC Signature Validation
    if (config.secretHmac) {
      const sigHeader = payload.headers['x-automation-signature'];
      if (!sigHeader) {
        throw new WebhookValidationError("Missing signature header: x-automation-signature");
      }

      const expectedSignature = this.generateHmac(payload.body, config.secretHmac);
      
      // Use timing-safe equal to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, "hex");
      const actualBuffer = Buffer.from(sigHeader, "hex");
      
      if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
        throw new WebhookValidationError("HMAC signature validation failed.");
      }
    }

    return true;
  }

  private generateHmac(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return hmac.digest("hex");
  }
}
