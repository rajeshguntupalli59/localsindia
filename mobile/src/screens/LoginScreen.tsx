import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';

import LOGO from '../../assets/logo-mark-transparent.png';

type Step = 'phone' | 'otp' | 'name';

export default function LoginScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string } | null>(null);

  const finish = async (data: any) => {
    await storage.setTokens(data.access_token, data.refresh_token ?? '');
    await storage.setUser(data.user);
    navigation.replace('Main');
  };

  const handleSignIn = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.signin(`+91${phone}`);
      await finish(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        Alert.alert('No account found', 'No account with this number. Sign up first.', [
          { text: 'Sign Up', onPress: handleSignUp },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', err?.response?.data?.detail || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.sendOtp(`+91${phone}`);
      if (data.otp) setDebugOtp(data.otp);
      setStep('otp');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Already registered', 'This number already has an account.', [
          { text: 'Sign In', onPress: handleSignIn },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', 'Could not send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length < 6) { Alert.alert('Invalid OTP', 'Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(`+91${phone}`, otp);
      if (data.is_new_user) {
        setPendingTokens({ access: data.access_token, refresh: data.refresh_token ?? '' });
        await storage.setUser(data.user);
        setStep('name');
      } else {
        await finish(data);
      }
    } catch {
      Alert.alert('Invalid OTP', 'The code is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    if (name.trim().length < 2) { Alert.alert('Name required', 'Enter at least 2 characters.'); return; }
    if (!pendingTokens) return;
    setLoading(true);
    try {
      await storage.setTokens(pendingTokens.access, pendingTokens.refresh);
      const updated = await authApi.updateName(name.trim());
      await storage.setUser(updated);
      navigation.replace('Main');
    } catch {
      Alert.alert('Error', 'Could not save your name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtextMap: Record<Step, string> = {
    phone: 'Sign in or create a free account',
    otp: `OTP sent to +91 ${phone}`,
    name: 'One last step — tell us your name',
  };

  const headingMap: Record<Step, string> = {
    phone: 'Welcome to LocalsIndia',
    otp: 'Enter OTP',
    name: 'Almost done!',
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandName}>LocalsIndia</Text>
          <Text style={styles.tagline}>Buy. Sell. Connect.</Text>
          <Text style={styles.heading}>{headingMap[step]}</Text>
          <Text style={styles.subtext}>{subtextMap[step]}</Text>
        </View>

        <View style={styles.body}>

          {/* ── Phone screen ── */}
          {step === 'phone' && (
            <>
              <Text style={styles.label}>Mobile Number</Text>
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

              {/* Sign In + Sign Up side by side */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btnOutline, loading && styles.btnDisabled]}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#f97316" />
                    : <Text style={styles.btnOutlineText}>Sign In</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.btnText}>Sign Up →</Text>}
                </TouchableOpacity>
              </View>

            </>
          )}

          {/* ── OTP screen ── */}
          {step === 'otp' && (
            <>
              {debugOtp && (
                <View style={styles.debugBox}>
                  <Text style={styles.debugText}>Debug OTP: {debugOtp}</Text>
                </View>
              )}

              <Text style={styles.label}>6-digit OTP</Text>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.btn, (loading || otp.length < 6) && styles.btnDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading || otp.length < 6}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Verify OTP</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep('phone'); setOtp(''); setDebugOtp(undefined); }}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkAction}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Name screen ── */}
          {step === 'name' && (
            <>
              <Text style={styles.label}>Your Name</Text>
              <View style={styles.nameRow}>
                <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Rajesh Kumar"
                  autoFocus
                  maxLength={60}
                />
              </View>
              <Text style={styles.hintSmall}>Shown to other users on your listings</Text>

              <TouchableOpacity
                style={[styles.btn, (loading || name.trim().length < 2) && styles.btnDisabled]}
                onPress={handleNameSubmit}
                disabled={loading || name.trim().length < 2}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Get Started →</Text>}
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.privacy}>
            By continuing, you agree to our{' '}
            <Text style={styles.privacyLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.privacyLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { flexGrow: 1 },

  header: { backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 72, paddingBottom: 28 },
  logo: { width: 48, height: 48, marginBottom: 6 },
  brandName: { fontSize: 26, fontWeight: 'bold', color: '#f97316', marginBottom: 2 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  subtext: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  hint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 16, marginTop: 8 },
  hintSmall: { fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 16 },

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

  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },

  btn: { flex: 1, backgroundColor: '#f97316', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  btnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#f97316',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  btnOutlineText: { color: '#f97316', fontSize: 16, fontWeight: '700' },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  nameIcon: { marginRight: 8 },
  nameInput: { flex: 1, fontSize: 16, paddingVertical: 14 },

  otpInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 16,
  },

  debugBox: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  debugText: { color: '#92400e', fontWeight: '700', textAlign: 'center' },

  switchLink: { alignItems: 'center', marginTop: 12 },
  switchLinkAction: { color: '#f97316', fontWeight: '600', fontSize: 14 },

  privacy: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 28, lineHeight: 16 },
  privacyLink: { color: '#6b7280', textDecorationLine: 'underline' },
});
