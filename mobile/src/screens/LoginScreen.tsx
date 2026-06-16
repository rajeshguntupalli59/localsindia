import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';

const LOGO = require('../../assets/logo-mark-transparent.png');

WebBrowser.maybeCompleteAuthSession();

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.sendOtp(`+91${phone}`);
      if (data.otp) setDebugOtp(data.otp); // debug mode OTP shown on screen
      setStep('otp');
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(`+91${phone}`, otp);
      await storage.setTokens(data.access_token, data.refresh_token);
      await storage.setUser(data.user);
      navigation.replace('Main');
    } catch {
      Alert.alert('Invalid OTP', 'The code you entered is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const googleUrl = `${API_BASE}/auth/google?mobile=1`;
      const callbackScheme = Linking.createURL('auth/callback');

      const result = await WebBrowser.openAuthSessionAsync(googleUrl, callbackScheme);

      if (result.type !== 'success') return; // user cancelled

      const parsed = Linking.parse(result.url);
      const params = parsed.queryParams as Record<string, string> ?? {};

      if (params.error) {
        Alert.alert('Google sign-in failed', params.error === 'google_denied'
          ? 'Sign-in was cancelled.'
          : 'Google sign-in failed. Please try again.');
        return;
      }

      const { token, refresh, name } = params;
      if (!token) { Alert.alert('Error', 'No token received.'); return; }

      await storage.setTokens(token, refresh ?? '');

      // Fetch full profile so user object has id/phone/role
      const user = await authApi.getMe();
      await storage.setUser(user);

      navigation.replace('Main');
    } catch {
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
      <Text style={styles.logo}>LocalsIndia</Text>
      <Text style={styles.tagline}>Buy. Sell. Connect.</Text>

      <Text style={styles.heading}>
        {step === 'phone' ? 'Enter your WhatsApp number' : 'Enter OTP'}
      </Text>
      <Text style={styles.subtext}>
        {step === 'phone'
          ? "We'll send a verification code to your number."
          : `Code sent to +91 ${phone}`}
      </Text>

      {step === 'phone' ? (
        <>
          {/* Google sign-in */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            onPress={signInWithGoogle}
            disabled={loading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use your phone</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.phoneRow}>
            <Text style={styles.countryCode}>🇮🇳 +91</Text>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send OTP →'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {debugOtp && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText}>Debug OTP: {debugOtp}</Text>
            </View>
          )}
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={verifyOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & Continue →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Change number</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 24, justifyContent: 'center' },
  logoImage: { width: 64, height: 64, alignSelf: 'center', marginBottom: 8 },
  logo: { fontSize: 30, fontWeight: 'bold', color: '#f97316', textAlign: 'center', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 40 },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  subtext: { fontSize: 13, color: '#6b7280', marginBottom: 24 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  countryCode: { fontSize: 16, marginRight: 8, color: '#374151' },
  phoneInput: { flex: 1, fontSize: 18, paddingVertical: 14, letterSpacing: 1 },
  debugBox: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  debugText: { color: '#92400e', fontWeight: '700', textAlign: 'center' },
  otpInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  btn: { backgroundColor: '#f97316', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#fdba74' },
  btnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { color: '#f97316', fontSize: 14 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'white',
    marginBottom: 4,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
});
