import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput,
  Linking, Alert, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buyerRequestsApi, categoriesApi } from '../lib/api';
import { storage } from '../lib/storage';
import { formatPrice } from '../lib/format';
import { C, SHADOW, RADIUS } from '../lib/theme';

interface Category { id: string; slug: string; name: string }
interface BuyerRequest {
  id: string; description: string; budget: number | null; contact_phone: string;
  status: string; created_at: string; user_id: string;
  category_name: string | null; category_slug: string | null;
}

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tiffin: 'fast-food-outline', 'pg-roommate': 'home-outline', jobs: 'briefcase-outline',
  vehicles: 'car-outline', electronics: 'phone-portrait-outline', education: 'school-outline',
  events: 'calendar-outline', businesses: 'storefront-outline', classifieds: 'pricetags-outline',
  services: 'construct-outline', 'real-estate': 'business-outline', furniture: 'cube-outline',
  fashion: 'shirt-outline', doctors: 'medical-outline',
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props { citySlug: string; navigation: any }

export default function BuyerRequestsSection({ citySlug, navigation }: Props) {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [categorySlug, setCategorySlug] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    buyerRequestsApi.list(citySlug).then(setRequests).catch(() => {});
    categoriesApi.list().then(setCategories).catch(() => {});
    storage.getUser().then(u => setCurrentUserId(u?.id ?? null));
  }, [citySlug]);

  const handleReport = async (id: string) => {
    try {
      await buyerRequestsApi.report(id, 'spam');
      setReportedIds(prev => new Set(prev).add(id));
    } catch {
      Alert.alert('Error', 'Could not report this request.');
    }
  };

  const handleFulfill = async (id: string) => {
    try {
      await buyerRequestsApi.fulfill(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch {
      Alert.alert('Error', 'Could not update request.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete request?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await buyerRequestsApi.delete(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete request.');
          }
        },
      },
    ]);
  };

  const openModal = async () => {
    const user = await storage.getUser();
    if (!user) {
      Alert.alert('Login required', 'Please log in to post a request.');
      return;
    }
    // Pre-fill from the account's phone as a starting suggestion, but this
    // request may need a different number to reach the poster — always
    // shown and editable, never silently sent behind the scenes.
    const digits = (user.phone ?? '').replace('+91', '');
    setContactPhone(digits);
    setShowModal(true);
  };

  const handlePost = async () => {
    if (!categorySlug) { Alert.alert('Pick a category'); return; }
    if (description.trim().length < 10) { Alert.alert('Description too short', 'Describe what you need (10+ characters).'); return; }
    if (!/^[6-9]\d{9}$/.test(contactPhone)) { Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number for buyers to contact you.'); return; }
    setSubmitting(true);
    try {
      const r = await buyerRequestsApi.create({
        city_slug: citySlug,
        category_slug: categorySlug,
        description: description.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        contact_phone: `+91${contactPhone}`,
      });
      setRequests(prev => [r, ...prev]);
      setShowModal(false);
      setCategorySlug('');
      setDescription('');
      setBudget('');
      setContactPhone('');
    } catch {
      Alert.alert('Error', 'Could not post your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Wanted 🔍</Text>
          <Text style={styles.sectionSub}>People looking to buy — reach out if you have it</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={styles.postBtn} activeOpacity={0.85}>
          <Text style={styles.postBtnText}>+ I'm looking for...</Text>
        </TouchableOpacity>
      </View>

      {requests.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={requests}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item: r }) => {
            const isOwner = currentUserId !== null && r.user_id === currentUserId;
            const reported = reportedIds.has(r.id);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Ionicons name={CAT_ICONS[r.category_slug ?? ''] ?? 'search-outline'} size={16} color={C.orange} />
                    <Text style={styles.catName}>{r.category_name}</Text>
                  </View>
                  {!isOwner && (
                    <TouchableOpacity onPress={() => handleReport(r.id)} disabled={reported} hitSlop={8}>
                      <Ionicons name="flag-outline" size={14} color={reported ? C.danger : C.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.description} numberOfLines={2}>{r.description}</Text>
                {r.budget != null && <Text style={styles.budget}>Budget: {formatPrice(r.budget)}</Text>}
                <Text style={styles.timeAgo}>{timeAgo(r.created_at)}</Text>
                {isOwner ? (
                  <View style={styles.ownerRow}>
                    <TouchableOpacity style={styles.fulfillBtn} onPress={() => handleFulfill(r.id)}>
                      <Ionicons name="checkmark" size={14} color="white" />
                      <Text style={styles.fulfillBtnText}>Fulfilled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r.id)}>
                      <Ionicons name="trash-outline" size={14} color={C.textSub} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => {
                      const phone = r.contact_phone.replace('+', '');
                      const msg = encodeURIComponent(`Hi! I saw your request on LocalsIndia for "${r.description.slice(0, 50)}" — I can help!`);
                      Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="white" />
                    <Text style={styles.waBtnText}>I have this!</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      ) : (
        <Text style={styles.emptyText}>No requests yet — be the first to post what you're looking for.</Text>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>What are you looking for?</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsWrap}>
              {categories.map(cat => {
                const active = categorySlug === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategorySlug(cat.slug)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons name={CAT_ICONS[cat.slug] ?? 'pricetag-outline'} size={13} color={active ? C.orange : C.textSub} />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Describe what you need</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Looking for a 2BHK PG for females under ₹7000, meals included"
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              style={styles.textarea}
            />

            <Text style={styles.label}>Budget (optional)</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={styles.budgetInput}
              />
            </View>

            <Text style={styles.label}>Contact number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>🇮🇳 +91</Text>
              <TextInput
                value={contactPhone}
                onChangeText={t => setContactPhone(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.phoneInput}
              />
            </View>
            <Text style={styles.phoneHint}>Buyers will see and message this number on WhatsApp — change it if you'd rather they reach a different one.</Text>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handlePost}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="send" size={16} color="white" />
                  <Text style={styles.submitBtnText}>Post Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    ...SHADOW.card,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14, gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  sectionSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  postBtn: { backgroundColor: C.orange, paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.pill, ...SHADOW.orange },
  postBtnText: { color: 'white', fontSize: 11.5, fontWeight: '700' },

  card: {
    width: 200, backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.divider, padding: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catName: { fontSize: 11, fontWeight: '600', color: C.textSub },
  description: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 },
  budget: { fontSize: 11, fontWeight: '700', color: C.orange, marginBottom: 6 },
  timeAgo: { fontSize: 10, color: C.textMuted, marginBottom: 8 },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.waGreen, paddingVertical: 8, borderRadius: RADIUS.sm,
  },
  waBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', gap: 8 },
  fulfillBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: C.orange, paddingVertical: 8, borderRadius: RADIUS.sm,
  },
  fulfillBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    paddingHorizontal: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: C.textSub },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  label: { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.border,
  },
  chipActive: { borderColor: C.orange, backgroundColor: C.orangeLight },
  chipText: { fontSize: 12.5, fontWeight: '600', color: C.textSub },
  chipTextActive: { color: C.orange },
  textarea: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md, padding: 14, fontSize: 14,
    color: C.text, marginBottom: 16, textAlignVertical: 'top', minHeight: 76,
  },
  budgetRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 20,
  },
  rupee: { fontSize: 14, fontWeight: '700', color: C.textSub, marginRight: 6 },
  budgetInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 12 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 8,
  },
  countryCode: { fontSize: 14, fontWeight: '700', color: C.text },
  phoneInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 12 },
  phoneHint: { fontSize: 11, color: C.textMuted, marginBottom: 20, lineHeight: 15 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.orange, paddingVertical: 14, borderRadius: RADIUS.md, ...SHADOW.orange,
  },
  submitBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
