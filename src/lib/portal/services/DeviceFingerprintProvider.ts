import { createHash } from 'crypto';

export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  ipAddress: string;
}

export interface DeviceFingerprintProvider {
  /**
   * Generates or retrieves a unique fingerprint for the current client device.
   * This must not rely on third-party dependencies as per architectural constraints.
   */
  getFingerprint(requestData: { userAgent?: string; ipAddress?: string; headers?: Record<string, string> }): Promise<DeviceFingerprint>;
}

export class DefaultDeviceFingerprintProvider implements DeviceFingerprintProvider {
  async getFingerprint(requestData: { userAgent?: string; ipAddress?: string; headers?: Record<string, string> }): Promise<DeviceFingerprint> {
    const { userAgent = 'unknown', ipAddress = 'unknown', headers = {} } = requestData;
    
    const rawData = `${ipAddress}|${userAgent}|${headers['accept-language'] || ''}`;
    
    const hash = createHash('sha256').update(rawData).digest('hex');
    
    return {
      fingerprint: `fp_${hash}`,
      userAgent,
      ipAddress
    };
  }
}

