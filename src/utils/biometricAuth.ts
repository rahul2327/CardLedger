import {registerPlugin} from '@capacitor/core';
import {isNativeAndroid} from './nativeAndroid';

interface BiometricAuthNativePlugin {
  isAvailable(): Promise<{available: boolean; statusCode: number}>;
  authenticate(options?: {title?: string; subtitle?: string}): Promise<{verified: boolean}>;
}

const BiometricAuth = registerPlugin<BiometricAuthNativePlugin>('BiometricAuth');

const BIOMETRIC_CACHE_KEY = 'cardledger_biometric_lock';

export function getCachedBiometricLock(): boolean {
  try {
    return localStorage.getItem(BIOMETRIC_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCachedBiometricLock(enabled: boolean): void {
  try {
    localStorage.setItem(BIOMETRIC_CACHE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota errors
  }
}

export async function checkBiometricAvailability(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const res = await BiometricAuth.isAvailable();
    return Boolean(res?.available);
  } catch {
    return false;
  }
}

export async function promptBiometricAuth(
  title = 'Unlock CardLedger',
  subtitle = 'Use your fingerprint or device lock to continue'
): Promise<{verified: boolean; error?: string}> {
  if (!isNativeAndroid()) {
    return {verified: false, error: 'Fingerprint lock is only available in the Android app.'};
  }
  try {
    const res = await BiometricAuth.authenticate({title, subtitle});
    return {verified: Boolean(res?.verified)};
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Authentication cancelled or failed.';
    return {verified: false, error: msg};
  }
}
