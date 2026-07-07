import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi, categoriesApi } from '../lib/api';
import { storage } from '../lib/storage';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tiffin:        'restaurant-outline',
  'pg-roommate': 'home-outline',
  jobs:          'briefcase-outline',
  vehicles:      'car-outline',
  electronics:   'phone-portrait-outline',
  education:     'school-outline',
  events:        'calendar-outline',
  businesses:    'storefront-outline',
};

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

const STEPS = ['Details', 'Photos', 'Contact'];

type Category = { id: string; name: string; slug: string; icon: string };

export default function PostScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(undefined);
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [cityName, setCityName] = useState('Hyderabad');
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOn, setWhatsappOn] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    storage.getUser().then(u => {
      setUser(u);
      if (u?.phone) {
        const digits = u.phone.replace('+91', '');
        setPhone(digits);
      }
    }).catch(() => setUser(null));
    storage.getCity().then(c => {
      if (c) { setCitySlug(c.slug); setCityName(c.name); }
    });
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  const pickImage = async () => {
    if (images.length >= 5) { Alert.alert('Max 5 photos allowed'); return; }
    const remaining = 5 - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 5) e.title = 'Minimum 5 characters';
    if (!categorySlug) e.category = 'Please pick a category';
    if (!description.trim() || description.trim().length < 20) e.description = 'At least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 2) { submit(); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const uploadPhoto = async (listingId: string, uri: string, index: number) => {
    const token = await storage.getAccessToken();
    const result = await FileSystem.uploadAsync(
      `${API_BASE}/upload/image/${listingId}`,
      uri,
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: (FileSystem.FileSystemUploadType?.MULTIPART ?? 1) as any,
        headers: { Authorization: `Bearer ${token ?? ''}` },
      }
    );
    if (result.status >= 400) {
      let detail = `HTTP ${result.status}`;
      try { detail = JSON.parse(result.body)?.detail ?? detail; } catch {}
      throw new Error(`Photo ${index + 1} upload failed: ${detail}`);
    }
  };

  const submit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const listing = await listingsApi.create({
        title: title.trim(),
        description: description.trim(),
        price: price ? parseInt(price, 10) : null,
        area: area.trim() || null,
        category_slug: categorySlug,
        contact_phone: `+91${phone}`,
        city_slug: citySlug,
        whatsapp_url: whatsappOn ? `https://wa.me/91${phone}` : null,
        website_url: websiteUrl.trim() || null,
        social_url: socialUrl.trim() || null,
      });

      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1}/${images.length}...`);
          await uploadPhoto(listing.id, images[i], i);
        }
        setUploadProgress('');
      }

      setSuccess(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        await storage.clear();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'Sign In', onPress: () => navigation.replace('Login') },
        ]);
        return;
      }
      const detail = err?.response?.data?.detail || err?.message || 'Please try again.';
      Alert.alert('Error', `Failed to post listing: ${detail}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // ── LOADING STATE ──
  if (user === undefined) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );

  // ── AUTH GATE ──
  if (!user) {
    return (
      <View style={styles.gateContainer}>
        <Ionicons name="lock-closed-outline" size={56} color="#e5e7eb" />
        <Text style={styles.gateTitle}>Sign in to post</Text>
        <Text style={styles.gateText}>Create a free account to post listings and reach thousands of local buyers.</Text>
        <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.gateBtnText}>Sign in with Phone OTP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setArea('');
    setCategorySlug('');
    setImages([]);
    setWebsiteUrl('');
    setSocialUrl('');
    setErrors({});
    setStep(0);
    setSuccess(false);
  };

  // ── SUCCESS SCREEN ──
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark" size={48} color="#f97316" />
        </View>
        <Text style={styles.successTitle}>Listing submitted!</Text>
        <Text style={styles.successText}>
          Your listing is under review. We'll activate it shortly — usually within an hour.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={resetForm}>
          <Text style={styles.doneBtnText}>+ Post Another Listing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeLink} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Cancel and go back' : 'Previous step'}
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Listing</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Step bubbles */}
      <View style={styles.stepsRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepBubble, i <= step ? styles.stepBubbleActive : styles.stepBubbleInactive]}>
              {i < step
                ? <Ionicons name="checkmark" size={14} color="white" />
                : <Text style={[styles.stepNum, i === step ? styles.stepNumActive : styles.stepNumInactive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === step ? styles.stepLabelActive : styles.stepLabelInactive]}>{label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepConnector, i < step ? styles.stepConnectorDone : styles.stepConnectorPending]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── STEP 1: DETAILS ── */}
        {step === 0 && (
          <>
            {/* Title + Description + Price + Area */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What are you selling?</Text>

              <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={t => { setTitle(t); if (errors.title) setErrors(e => ({ ...e, title: '' })); }}
                placeholder="e.g. Honda Activa 6G 2022 — Low Mileage"
                maxLength={100}
              />
              {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

              <Text style={[styles.label, { marginTop: 16 }]}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textarea, errors.description && styles.inputError]}
                value={description}
                onChangeText={t => { setDescription(t); if (errors.description) setErrors(e => ({ ...e, description: '' })); }}
                placeholder="Describe your item — condition, age, any defects, reason for selling..."
                multiline
                numberOfLines={5}
                maxLength={1000}
                textAlignVertical="top"
              />
              <View style={styles.descRow}>
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : <Text />}
                <Text style={styles.charCount}>{description.length}/1000</Text>
              </View>
            </View>

            {/* Category */}
            <View style={[styles.card, errors.category && styles.cardError]}>
              <Text style={styles.cardTitle}>
                Pick a category <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.catGrid}>
                {categories.map(c => {
                  const active = categorySlug === c.slug;
                  return (
                    <TouchableOpacity
                      key={c.slug}
                      style={[styles.catCard, active && styles.catCardActive]}
                      onPress={() => { setCategorySlug(c.slug); setErrors(e => ({ ...e, category: '' })); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Category: ${c.name}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[c.slug] ?? 'pricetag-outline'}
                        size={22}
                        color={active ? '#f97316' : '#6b7280'}
                      />
                      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.category ? <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.category}</Text> : null}
            </View>

            {/* Price + Area */}
            <View style={styles.card}>
              <Text style={styles.label}>Price (₹) <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.priceRow}>
                <Text style={styles.pricePrefix}>₹</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0 — leave blank for 'Price on request'"
                  keyboardType="numeric"
                />
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Area / Locality <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Koramangala, Banjara Hills"
                maxLength={100}
              />
              <Text style={styles.hint}>Helps buyers find listings near them</Text>
            </View>

            {/* Tip card */}
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb-outline" size={16} color="#166534" />
                <Text style={styles.tipTitle}>Tips for more inquiries</Text>
              </View>
              {['Use a specific title (model, brand, year)', 'Write 3-4 sentences of description', 'Set a fair price to get quick responses'].map(t => (
                <Text key={t} style={styles.tipItem}>• {t}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── STEP 2: PHOTOS ── */}
        {step === 1 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add photos</Text>
              <Text style={styles.cardSubtitle}>Listings with photos get 5× more inquiries. Add up to 5 — first photo is the cover.</Text>

              {images.length < 5 && (
                <TouchableOpacity style={styles.uploadZone} onPress={pickImage}>
                  <View style={styles.uploadIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={28} color="#f97316" />
                  </View>
                  <Text style={styles.uploadTitle}>Tap to add photos</Text>
                  <Text style={styles.uploadSubtitle}>JPEG, PNG — max 5MB each</Text>
                </TouchableOpacity>
              )}

              {images.length > 0 && (
                <View style={styles.photoGrid}>
                  {images.map((uri, i) => (
                    <View key={uri} style={styles.photoWrapper}>
                      <Image source={{ uri }} style={styles.photo} />
                      {i === 0 && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove photo ${i + 1}`}
                      >
                        <Ionicons name="close-circle" size={22} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.photoCount}>{images.length}/5 photos added</Text>
            </View>

            {/* Photo tips */}
            <View style={[styles.tipCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
              <View style={styles.tipHeader}>
                <Ionicons name="camera-outline" size={16} color="#92400E" />
                <Text style={[styles.tipTitle, { color: '#92400E' }]}>Photo tips</Text>
              </View>
              {[
                'Shoot in natural light near a window',
                'Show all angles of the item',
                'Include any defects or wear clearly',
                'Clean the item before photographing',
              ].map(t => (
                <Text key={t} style={[styles.tipItem, { color: '#78350F' }]}>• {t}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── STEP 3: CONTACT ── */}
        {step === 2 && (
          <>
            {/* Mini listing summary */}
            {(title || images.length > 0) && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>YOUR LISTING SUMMARY</Text>
                {images.length > 0 && (
                  <Image source={{ uri: images[0] }} style={styles.summaryThumb} />
                )}
                {title ? <Text style={styles.summaryTitle} numberOfLines={2}>{title}</Text> : null}
                {price ? (
                  <Text style={styles.summaryPrice}>₹{parseInt(price, 10).toLocaleString('en-IN')}</Text>
                ) : null}
                <Text style={styles.summaryCity}>
                  <Ionicons name="location-outline" size={12} /> {area ? `${area}, ` : ''}{cityName}
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact details</Text>

              <Text style={styles.label}>WhatsApp / Mobile Number <Text style={styles.required}>*</Text></Text>
              <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
                <Text style={styles.countryCode}>🇮🇳 +91</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={t => { setPhone(t.replace(/\D/g, '').slice(0, 10)); if (errors.phone) setErrors(e => ({ ...e, phone: '' })); }}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* WhatsApp toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Enable WhatsApp contact</Text>
                  <Text style={styles.toggleSubtitle}>Buyers can message you directly on WhatsApp</Text>
                </View>
                <Switch
                  value={whatsappOn}
                  onValueChange={setWhatsappOn}
                  trackColor={{ false: '#d1d5db', true: '#25D366' }}
                  thumbColor="white"
                />
              </View>

              {/* Optional online presence */}
              <Text style={[styles.label, { marginTop: 20 }]}>
                Online presence <Text style={styles.optional}>(optional)</Text>
              </Text>
              <Text style={styles.hint}>Add your website or social page so buyers can learn more</Text>

              <View style={styles.urlRow}>
                <Ionicons name="globe-outline" size={18} color="#9ca3af" style={styles.urlIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://yourwebsite.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.urlRow, { marginTop: 10 }]}>
                <Ionicons name="share-social-outline" size={18} color="#9ca3af" style={styles.urlIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={socialUrl}
                  onChangeText={setSocialUrl}
                  placeholder="https://instagram.com/yourpage"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer nav */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Cancel and go back' : 'Previous step'}
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
          <Text style={styles.backBtnText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.btnDisabled]}
          onPress={handleNext}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={step === 2 ? 'Post listing' : 'Next step'}
          accessibilityState={{ disabled: loading }}
        >
          {loading
            ? <Text style={styles.nextBtnText}>{uploadProgress || 'Posting...'}</Text>
            : step === 2
              ? <><Text style={styles.nextBtnText}>✦ Post Listing</Text></>
              : <Text style={styles.nextBtnText}>Next →</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },

  // Step bubbles
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stepBubbleActive: { backgroundColor: '#f97316' },
  stepBubbleInactive: { backgroundColor: '#f3f4f6' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepNumActive: { color: 'white' },
  stepNumInactive: { color: '#9ca3af' },
  stepLabel: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  stepLabelActive: { color: '#f97316' },
  stepLabelInactive: { color: '#9ca3af' },
  stepConnector: { flex: 1, height: 2, borderRadius: 1 },
  stepConnectorDone: { backgroundColor: '#f97316' },
  stepConnectorPending: { backgroundColor: '#e5e7eb' },

  // Body
  body: { padding: 16 },

  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardError: { borderColor: '#ef4444' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  optional: { fontWeight: '400', color: '#9ca3af', fontSize: 12 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
    color: '#111827',
  },
  inputError: { borderColor: '#ef4444' },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  descRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  charCount: { fontSize: 12, color: '#9ca3af' },

  // Category
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catCardActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 10, color: '#6b7280', marginTop: 3, textAlign: 'center' },
  catLabelActive: { color: '#f97316', fontWeight: '700' },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix: { fontSize: 18, fontWeight: '700', color: '#374151' },

  // Photos
  uploadZone: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  uploadSubtitle: { fontSize: 12, color: '#9ca3af' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoWrapper: { position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 12 },
  coverBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#f97316',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coverBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  photoCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },

  // Contact
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 12 },
  summaryThumb: { width: '100%', height: 140, borderRadius: 14, marginBottom: 10 },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  summaryPrice: { fontSize: 20, fontWeight: '900', color: '#f97316', marginBottom: 4 },
  summaryCity: { fontSize: 12, color: '#9ca3af' },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    marginBottom: 4,
  },
  countryCode: { fontSize: 16, marginRight: 8, color: '#374151' },
  phoneInput: { flex: 1, fontSize: 17, paddingVertical: 12, letterSpacing: 0.5, color: '#111827' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  urlIcon: { flexShrink: 0 },

  // Tip cards
  tipCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
    marginBottom: 16,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  tipItem: { fontSize: 12, color: '#166534', lineHeight: 20, paddingLeft: 4 },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  nextBtn: { flex: 1, backgroundColor: '#f97316', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#fdba74' },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Auth gate
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  gateTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  gateText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  gateBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  gateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  successText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: { backgroundColor: '#f97316', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16, marginBottom: 14 },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
});
