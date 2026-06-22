import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const hasFaceId = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: hasFaceId ? 'Use Face ID to sign in' : 'Use fingerprint to sign in',
    cancelLabel: 'Use OTP instead',
    disableDeviceFallback: false,
  });
  return result.success;
}
