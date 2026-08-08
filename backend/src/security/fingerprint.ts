import { SECURITY_CONFIG } from '../config/securityConfig.js';
import trustedDeviceService from '../services/trustedDeviceService.js';
import logger from '../lib/logger.js';

interface FingerprintResult {
  isTrusted: boolean;
  riskScoreModifier: number;
}

/**
 * Checks if a given device fingerprint hash is trusted for the user.
 * If unrecognized or missing, returns a risk modifier of +20.
 */
export async function verifyDeviceFingerprint(
  userId: string,
  fingerprint?: string
): Promise<FingerprintResult> {
  // If the fingerprint is missing, flag it as a threat risk signal (+20)
  if (!fingerprint) {
    logger.warn(`[Fingerprint] Request is missing device fingerprint | User: ${userId}`);
    return {
      isTrusted: false,
      riskScoreModifier: SECURITY_CONFIG.riskScore.weights.unknownDevice, // +20
    };
  }

  const isTrusted = await trustedDeviceService.isDeviceTrusted(userId, fingerprint);

  if (isTrusted) {
    return {
      isTrusted: true,
      riskScoreModifier: 0,
    };
  }

  // New/unknown device detected
  logger.info(`[Fingerprint] Unrecognized device fingerprint detected: ${fingerprint} for user: ${userId}`);
  return {
    isTrusted: false,
    riskScoreModifier: SECURITY_CONFIG.riskScore.weights.unknownDevice, // +20
  };
}

/**
 * Adds a fingerprint to the user's list of trusted devices.
 * Uses trustedDeviceService to cap active trusted devices at 10 items.
 */
export async function trustDeviceFingerprint(
  userId: string,
  fingerprint: string
): Promise<void> {
  if (!fingerprint) return;
  await trustedDeviceService.addTrustedDevice(userId, fingerprint);
}
