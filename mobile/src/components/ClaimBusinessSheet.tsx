import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator,
  ScrollView, Image, Alert, Linking, Keyboard, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../lib/api';
import { storage } from '../lib/storage';
import ReviewInviteCard from './ReviewInviteCard';

type Options = {
  claimed: boolean;
  is_owner: boolean;
  otp_available: boolean;
  masked_phone: string | null;
  pending_claim: boolean;
  doc_types: { key: string; label: string }[];
};

const errorText = (err: any, fallback: string) =>
  err?.response?.data?.detail ?? (err instanceof Error ? err.message : null) ?? fallback;

// Same three routes as the website's ClaimBusinessModal: an SMS code to the
// business's own number (instant), proof documents reviewed by an admin, or
// email to support.
export default function ClaimBusinessSheet({ visible, businessId, businessName, businessUrl, onClose, onClaimed }: {
  visible: boolean;
  businessId: string;
  businessName: string;
  businessUrl: string;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [tab, setTab] = useState<'otp' | 'docs'>('otp');
  const [done, setDone] = useState<'approved' | 'pending' | null>(null);
  const [busy, setBusy] = useState(false);
  // Lift the sheet by the keyboard's height while it's open (KeyboardAvoidingView
  // mis-measures inside a Modal on Android and left a gap after the keyboard closed).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // SMS code
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  // Documents
  const [docType, setDocType] = useState('');
  const [document, setDocument] = useState<string | null>(null);
  const [shopPhoto, setShopPhoto] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setOpts(null); setDone(null); setCodeSent(false); setCode('');
    businessesApi.claimOptions(businessId)
      .then((o: Options) => { setOpts(o); setTab(o.otp_available ? 'otp' : 'docs'); })
      .catch(err => { Alert.alert('Could not open', errorText(err, 'Please try again.')); onClose(); });
    storage.getUser().then((u: any) => {
      if (u?.phone) setContactPhone(String(u.phone).replace(/^\+91/, ''));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, businessId]);

  const sendCode = async () => {
    setBusy(true);
    try {
      await businessesApi.claimOtpSend(businessId);
      setCodeSent(true);
    } catch (err) {
      Alert.alert('Could not send code', errorText(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 4) return;
    setBusy(true);
    try {
      await businessesApi.claimOtpVerify(businessId, code.trim());
      setDone('approved');
      onClaimed();
    } catch (err) {
      Alert.alert('Not verified', errorText(err, 'Wrong code.'));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (set: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) set(result.assets[0].uri);
  };

  const submitDocuments = async () => {
    if (!docType) { Alert.alert('Choose a document type'); return; }
    if (!document || !shopPhoto) { Alert.alert('Add both photos', 'A photo of the document and of your shop front are needed.'); return; }
    setBusy(true);
    try {
      await businessesApi.claimDocuments(businessId, {
        doc_type: docType, contact_phone: contactPhone, note: note.trim() || undefined,
        document, shop_photo: shopPhoto, visiting_card: card,
      });
      setDone('pending');
    } catch (err) {
      Alert.alert('Could not submit', errorText(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const emailClaim = () => {
    const subject = `Claim: ${businessName} (${businessId})`;
    const body = `Hi LocalsIndia team,\n\nI own "${businessName}" (${businessUrl}).\nAttached: a business document and a photo of the shop front.\nMy LocalsIndia account phone: ${contactPhone}\n`;
    Linking.openURL(`mailto:support@localsindia.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const PhotoSlot = ({ label, uri, onPick, optional }: { label: string; uri: string | null; onPick: () => void; optional?: boolean }) => (
    <TouchableOpacity style={styles.photoSlot} onPress={onPick} activeOpacity={0.8}>
      {uri ? <Image source={{ uri }} style={styles.photoImg} /> : (
        <>
          <Ionicons name="camera-outline" size={22} color="#6b7280" />
          <Text style={styles.photoLabel}>{label}{optional ? ' (optional)' : ''}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { marginBottom: keyboardHeight }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>Claim {businessName}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {!opts ? (
            <ActivityIndicator style={{ marginVertical: 40 }} color="#f97316" />
          ) : done === 'approved' || opts.is_owner ? (
            <View style={styles.result}>
              <Ionicons name="checkmark-circle" size={44} color="#10b981" />
              <Text style={styles.resultTitle}>You now manage this business</Text>
              <Text style={styles.resultBody}>You can edit the details, add photos and see your analytics.</Text>
              <ReviewInviteCard businessName={businessName} url={businessUrl} />
            </View>
          ) : done === 'pending' || opts.pending_claim ? (
            <View style={styles.result}>
              <Ionicons name="time-outline" size={44} color="#f59e0b" />
              <Text style={styles.resultTitle}>Your claim is under review</Text>
              <Text style={styles.resultBody}>
                Our team checks claims within 1–2 days and may call the number you gave. You'll get a notification with the result.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {opts.claimed && (
                <Text style={styles.warn}>
                  Someone already manages this listing. If it's really yours, send documents — our team will review and can transfer ownership.
                </Text>
              )}

              {opts.otp_available && (
                <View style={styles.tabs}>
                  {(['otp', 'docs'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                      <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'otp' ? 'SMS code' : 'Documents'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tab === 'otp' && opts.otp_available ? (
                <View style={{ gap: 12 }}>
                  <Text style={styles.body}>
                    We'll send a 6-digit code to the business's phone number <Text style={{ fontWeight: '700' }}>{opts.masked_phone}</Text>.
                    Enter it here to claim instantly.
                  </Text>
                  {!codeSent ? (
                    <TouchableOpacity style={styles.primary} onPress={sendCode} disabled={busy}>
                      {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Send code</Text>}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input} value={code} onChangeText={setCode} placeholder="Enter 6-digit code"
                        keyboardType="number-pad" maxLength={6} placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity style={styles.primary} onPress={verifyCode} disabled={busy}>
                        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Verify and claim</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={sendCode} disabled={busy}>
                        <Text style={styles.link}>Resend code</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <Text style={styles.hint}>Don't have that phone? Use Documents instead.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Text style={styles.body}>
                    Upload a document showing the business name, plus a photo of your shop front. We review within 1–2 days — no visit needed.
                  </Text>
                  <Text style={styles.label}>Document type</Text>
                  <View style={styles.chips}>
                    {opts.doc_types.map(d => (
                      <TouchableOpacity key={d.key} style={[styles.chip, docType === d.key && styles.chipActive]} onPress={() => setDocType(d.key)}>
                        <Text style={[styles.chipText, docType === d.key && styles.chipTextActive]}>{d.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.photoRow}>
                    <PhotoSlot label="Document" uri={document} onPick={() => pick(setDocument)} />
                    <PhotoSlot label="Shop front" uri={shopPhoto} onPick={() => pick(setShopPhoto)} />
                    <PhotoSlot label="Visiting card" uri={card} onPick={() => pick(setCard)} optional />
                  </View>
                  <Text style={styles.label}>Phone we can call you on</Text>
                  <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={13} placeholderTextColor="#9ca3af" />
                  <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor="#9ca3af" />
                  <TouchableOpacity style={styles.primary} onPress={submitDocuments} disabled={busy}>
                    {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Submit for review</Text>}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={emailClaim} style={{ marginTop: 16 }}>
                <Text style={styles.link}>Prefer email? Send your documents to support@localsindia.com</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '90%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1, marginRight: 12 },
  warn: { backgroundColor: '#FFFBEB', color: '#78350F', fontSize: 12, padding: 12, borderRadius: 12, marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: 'white' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#111827' },
  body: { fontSize: 13, color: '#4b5563', lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151' },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827' },
  primary: { backgroundColor: '#f97316', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 15 },
  link: { color: '#2563eb', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 12, color: '#4b5563' },
  chipTextActive: { color: '#c2410c', fontWeight: '700' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoSlot: { flex: 1, height: 96, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center', paddingHorizontal: 4 },
  result: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'center' },
  resultBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
});
