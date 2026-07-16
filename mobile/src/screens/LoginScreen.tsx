import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';
import { isBiometricAvailable } from '../hooks/useBiometric';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SHADOW } from '../lib/theme';

const LOGO = require('../../assets/logo-mark-transparent.png');

type Step = 'phone' | 'otp' | 'create-password' | 'name' | 'forgot-phone' | 'forgot-otp' | 'forgot-reset' | 'admin';
type Mode = 'signin' | 'signup';

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<Mode>('signin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string } | null>(null);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 2000);
    if (logoTapCount.current >= 5) { logoTapCount.current = 0; setStep('admin'); }
  };

  const finish = async (data: any) => {
    await storage.setTokens(data.access_token, data.refresh_token ?? '');
    await storage.setUser(data.user);
    const biometricEnabled = await storage.getBiometricEnabled();
    if (!biometricEnabled) {
      const available = await isBiometricAvailable();
      if (available) {
        Alert.alert(
          'Enable Biometric Login?',
          'Sign in faster next time using your fingerprint.',
          [
            { text: 'Enable', onPress: async () => { await storage.setBiometricEnabled(true); navigation.replace('Main'); } },
            { text: 'Not now', style: 'cancel', onPress: () => navigation.replace('Main') },
          ]
        );
        return;
      }
    }
    navigation.replace('Main');
  };

  // ── Sign in: phone + password ──
  const handleLogin = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.'); return; }
    if (!password) { Alert.alert('Password required', 'Enter your password.'); return; }
    setLoading(true);
    try {
      const data = await authApi.login(`+91${phone}`, password);
      await finish(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        Alert.alert('No account found', 'No account with this number. Sign up first.', [
          { text: 'Sign Up', onPress: handleSignUp },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else if (status === 409) {
        Alert.alert('No password set', 'This account has no password yet. Use "Forgot password" to set one.');
      } else {
        Alert.alert('Sign in failed', err?.response?.data?.detail || 'Incorrect phone number or password.');
      }
    } finally { setLoading(false); }
  };

  // ── Sign up: phone → send OTP ──
  const handleSignUp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.'); return; }
    setLoading(true);
    try {
      const { has_account } = await authApi.checkPhone(`+91${phone}`);
      if (has_account) {
        Alert.alert('Already registered', 'This number already has an account. Please sign in with your password.');
        setMode('signin');
        return;
      }
      const data = await authApi.sendOtp(`+91${phone}`);
      if (data.otp) setDebugOtp(data.otp);
      setStep('otp');
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleOtpSubmit = async () => {
    if (otp.length < 6) { Alert.alert('Invalid OTP', 'Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(`+91${phone}`, otp);
      if (data.has_password) {
        Alert.alert('Already registered', 'This number already has an account. Please sign in with your password.');
        setMode('signin');
        setStep('phone');
        setOtp('');
        return;
      }
      setSetupToken(data.setup_token);
      setStep('create-password');
    } catch { Alert.alert('Invalid OTP', 'The code is incorrect. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleCreatePasswordSubmit = async () => {
    if (newPassword.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Passwords don\'t match', 'Re-enter your password.'); return; }
    if (!setupToken) return;
    setLoading(true);
    try {
      const data = await authApi.setPassword(setupToken, newPassword);
      if (data.is_new_user) {
        setPendingTokens({ access: data.access_token, refresh: data.refresh_token ?? '' });
        await storage.setUser(data.user);
        setStep('name');
      } else {
        await finish(data);
      }
    } catch { Alert.alert('Error', 'Could not set password. Please try again.'); }
    finally { setLoading(false); }
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
    } catch { Alert.alert('Error', 'Could not save your name. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Forgot password ──
  const handleForgotPhoneSubmit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.'); return; }
    setLoading(true);
    try {
      const data = await authApi.sendOtp(`+91${phone}`);
      if (data.otp) setDebugOtp(data.otp);
      setStep('forgot-otp');
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgotOtpSubmit = async () => {
    if (otp.length < 6) { Alert.alert('Invalid OTP', 'Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(`+91${phone}`, otp);
      setSetupToken(data.setup_token);
      setStep('forgot-reset');
    } catch { Alert.alert('Invalid OTP', 'The code is incorrect. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResetPasswordSubmit = async () => {
    if (newPassword.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Passwords don\'t match', 'Re-enter your password.'); return; }
    if (!setupToken) return;
    setLoading(true);
    try {
      const data = await authApi.setPassword(setupToken, newPassword);
      await finish(data);
    } catch { Alert.alert('Error', 'Could not reset password. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleAdminLogin = async () => {
    if (!adminUser.trim() || !adminPass.trim()) { Alert.alert('Required', 'Enter username and password.'); return; }
    setLoading(true);
    try {
      const data = await authApi.adminLogin(adminUser.trim(), adminPass.trim());
      await finish(data);
    } catch (err: any) {
      Alert.alert('Admin Login Failed', err?.response?.data?.detail || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  const heading =
    step === 'phone' ? (mode === 'signup' ? 'Create your account' : 'Welcome back') :
    step === 'otp' ? 'Verify OTP' :
    step === 'create-password' ? 'Create a password' :
    step === 'name' ? 'Almost done!' :
    step === 'forgot-phone' ? 'Reset your password' :
    step === 'forgot-otp' ? 'Verify OTP' :
    step === 'forgot-reset' ? 'Set a new password' :
    'Admin Access';

  const subheading =
    step === 'phone' ? (mode === 'signup' ? 'We\'ll send a 6-digit OTP to verify' : 'Enter your number and password') :
    step === 'otp' ? `Code sent to +91 ${phone}` :
    step === 'create-password' ? 'You\'ll use this to sign in next time' :
    step === 'name' ? 'What should we call you?' :
    step === 'forgot-phone' ? 'We\'ll send a reset code' :
    step === 'forgot-otp' ? `Code sent to +91 ${phone}` :
    step === 'forgot-reset' ? 'Choose a new password' :
    'Admin login only';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>

      {/* Atmospheric glow blobs */}
      <View style={styles.glowTR} pointerEvents="none" />
      <View style={styles.glowBL} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand hero ── */}
        <View style={[styles.hero, { paddingTop: Math.max(insets.top, 24) + 40 }]}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={1} style={styles.logoWrap}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.brandName}>LocalsIndia</Text>
          <Text style={styles.tagline}>Buy. Sell. Connect locally.</Text>
        </View>

        {/* ── Glass card ── */}
        <View style={styles.card}>

          {/* Step heading */}
          <Text style={styles.cardHeading}>{heading}</Text>
          <Text style={styles.cardSub}>{subheading}</Text>

          {/* Sign In / Sign Up tabs — only on phone step */}
          {step === 'phone' && (
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
                onPress={() => setMode('signin')}
              >
                <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Phone step ── */}
          {step === 'phone' && (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {mode === 'signin' && (
                <>
                  <View style={styles.nameRow}>
                    <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                    <TextInput
                      style={styles.nameInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor={C.textMuted}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setStep('forgot-phone'); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                    style={{ alignSelf: 'flex-start', marginBottom: 16 }}
                  >
                    <Text style={styles.linkBtnText}>Forgot password?</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={mode === 'signin' ? handleLogin : handleSignUp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'Sign In' : 'Send OTP →'}</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── OTP step (signup) ── */}
          {step === 'otp' && (
            <>
              {debugOtp && (
                <View style={styles.debugBox}>
                  <Text style={styles.debugText}>Debug OTP: {debugOtp}</Text>
                </View>
              )}
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || otp.length < 6) && styles.btnDisabled]}
                onPress={handleOtpSubmit}
                disabled={loading || otp.length < 6}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setDebugOtp(undefined); }} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Create password step (signup) ── */}
          {step === 'create-password' && (
            <>
              <View style={styles.nameRow}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.nameRow, { marginTop: 10 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 20 }, (loading || newPassword.length < 8) && styles.btnDisabled]}
                onPress={handleCreatePasswordSubmit}
                disabled={loading || newPassword.length < 8}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Continue →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Name step ── */}
          {step === 'name' && (
            <>
              <View style={styles.nameRow}>
                <Ionicons name="person-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  maxLength={60}
                />
              </View>
              <Text style={styles.fieldHint}>Shown to buyers on your listings</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || name.trim().length < 2) && styles.btnDisabled]}
                onPress={handleNameSubmit}
                disabled={loading || name.trim().length < 2}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Get Started →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Forgot password: phone step ── */}
          {step === 'forgot-phone' && (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleForgotPhoneSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Send reset code →</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('phone'); setMode('signin'); }} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>← Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Forgot password: OTP step ── */}
          {step === 'forgot-otp' && (
            <>
              {debugOtp && (
                <View style={styles.debugBox}>
                  <Text style={styles.debugText}>Debug OTP: {debugOtp}</Text>
                </View>
              )}
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || otp.length < 6) && styles.btnDisabled]}
                onPress={handleForgotOtpSubmit}
                disabled={loading || otp.length < 6}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Verify code</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('forgot-phone'); setOtp(''); setDebugOtp(undefined); }} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Forgot password: reset step ── */}
          {step === 'forgot-reset' && (
            <>
              <View style={styles.nameRow}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.nameRow, { marginTop: 10 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput
                  style={styles.nameInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} hitSlop={8}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 20 }, (loading || newPassword.length < 8) && styles.btnDisabled]}
                onPress={handleResetPasswordSubmit}
                disabled={loading || newPassword.length < 8}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Reset password →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Admin step ── */}
          {step === 'admin' && (
            <>
              <View style={styles.nameRow}>
                <Ionicons name="shield-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput style={styles.nameInput} value={adminUser} onChangeText={setAdminUser}
                  placeholder="Username" placeholderTextColor={C.textMuted} autoCapitalize="none" autoFocus />
              </View>
              <View style={[styles.nameRow, { marginTop: 10 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.nameIcon} />
                <TextInput style={styles.nameInput} value={adminPass} onChangeText={setAdminPass}
                  placeholder="Password" placeholderTextColor={C.textMuted} secureTextEntry />
              </View>
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }, loading && styles.btnDisabled]}
                onPress={handleAdminLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Login as Admin</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('phone'); setAdminUser(''); setAdminPass(''); }} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>← Back to regular login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Legal */}
        <Text style={styles.legal}>
          By continuing, you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navBg },

  glowTR: {
    position: 'absolute', top: -80, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.orange, opacity: 0.09,
  },
  glowBL: {
    position: 'absolute', bottom: 80, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#6366f1', opacity: 0.07,
  },

  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },

  // Hero
  hero: { alignItems: 'center', paddingBottom: 36 },
  logoWrap: { marginBottom: 14 },
  logo: { width: 72, height: 72 },
  brandName: {
    fontSize: 32, fontWeight: '900', color: C.orange,
    letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: { fontSize: 14, color: C.textOnDarkSub, letterSpacing: 0.2 },

  // Glass card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 24,
    marginBottom: 20,
  },

  cardHeading: {
    fontSize: 22, fontWeight: '800', color: C.textOnDark,
    marginBottom: 6, letterSpacing: -0.3,
  },
  cardSub: { fontSize: 13, color: C.textOnDarkSub, marginBottom: 20 },

  // Mode tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md - 2,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: 'white' },
  modeTabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  modeTabTextActive: { color: C.navBg },

  // Phone input
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.glassBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  countryCodeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: C.glassBorder,
  },
  flag: { fontSize: 18 },
  countryCode: { fontSize: 15, fontWeight: '700', color: C.textOnDark },
  phoneInput: {
    flex: 1, fontSize: 16, paddingHorizontal: 12, paddingVertical: 16,
    color: C.textOnDark, letterSpacing: 0.5,
  },

  // OTP input
  otpInput: {
    borderWidth: 1, borderColor: C.glassBorder,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, paddingVertical: 18,
    fontSize: 32, letterSpacing: 16, textAlign: 'center',
    color: C.textOnDark, marginBottom: 16,
  },

  // Name / generic labeled-row input
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.glassBorder,
    paddingHorizontal: 14, marginBottom: 4,
  },
  nameIcon: { marginRight: 10 },
  nameInput: { flex: 1, fontSize: 16, paddingVertical: 16, color: C.textOnDark },
  fieldHint: { fontSize: 12, color: C.textOnDarkSub, marginBottom: 20 },

  // Buttons
  primaryBtn: {
    backgroundColor: C.orange, borderRadius: RADIUS.md,
    paddingVertical: 17, alignItems: 'center', marginBottom: 12,
    ...SHADOW.orange,
  },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.45 },

  linkBtn: { alignItems: 'center', marginTop: 14 },
  linkBtnText: { color: C.orange, fontWeight: '700', fontSize: 14 },

  debugBox: {
    backgroundColor: 'rgba(254,243,199,0.15)', borderRadius: RADIUS.sm,
    padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(254,243,199,0.2)',
  },
  debugText: { color: '#FDE68A', fontWeight: '700', textAlign: 'center' },

  legal: {
    fontSize: 12, color: C.textOnDarkMuted, textAlign: 'center',
    marginBottom: 32, lineHeight: 18,
  },
  legalLink: { color: 'rgba(255,255,255,0.35)', textDecorationLine: 'underline' },
});
