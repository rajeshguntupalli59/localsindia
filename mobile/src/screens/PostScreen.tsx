import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '../lib/api';
import { storage } from '../lib/storage';

const CATEGORIES = [
  { slug: 'tiffin', label: 'Tiffin', emoji: '🍱' },
  { slug: 'pg-roommate', label: 'PG / Rooms', emoji: '🏠' },
  { slug: 'jobs', label: 'Jobs', emoji: '💼' },
  { slug: 'vehicles', label: 'Vehicles', emoji: '🚗' },
  { slug: 'electronics', label: 'Electronics', emoji: '📱' },
  { slug: 'education', label: 'Education', emoji: '📚' },
  { slug: 'events', label: 'Events', emoji: '🎉' },
  { slug: 'businesses', label: 'Businesses', emoji: '🏪' },
  { slug: 'doctors', label: 'Doctors', emoji: '🩺' },
];

const API_BASE = 'https://localsindia-backend.azurewebsites.net/api/v1';

export default function PostScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(undefined);
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [cityName, setCityName] = useState('Hyderabad');
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    storage.getUser().then(u => setUser(u)).catch(() => setUser(null));
    storage.getCity().then(c => {
      if (c) { setCitySlug(c.slug); setCityName(c.name); }
    });
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

  const validateStep1 = () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return false; }
    if (!categorySlug) { Alert.alert('Required', 'Please select a category.'); return false; }
    if (!description.trim()) { Alert.alert('Required', 'Please enter a description.'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return false;
    }
    return true;
  };

  const uploadPhoto = async (listingId: string, uri: string, index: number) => {
    const token = await storage.getAccessToken();
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `photo_${index}.jpg`,
    } as any);
    await fetch(`${API_BASE}/upload/image/${listingId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });
  };

  const submit = async () => {
    if (!validateStep3()) return;
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
      const detail = err?.response?.data?.detail || err?.message || 'Please try again.';
      Alert.alert('Error', `Failed to post listing: ${detail}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  if (user === undefined) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );

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

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Listing Submitted!</Text>
        <Text style={styles.successText}>Your listing is under review and will go live shortly.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(s => s - 1)}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Listing</Text>
        <Text style={styles.stepIndicator}>{step}/3</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >

        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Step 1 — Details</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Tiffin service for working professionals"
              maxLength={100}
            />

            <Text style={styles.label}>Category *</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.slug}
                  style={[styles.catCard, categorySlug === c.slug && styles.catCardActive]}
                  onPress={() => setCategorySlug(c.slug)}
                >
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catLabel, categorySlug === c.slug && styles.catLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you're offering..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />

            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Leave blank for 'Price on request'"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Area / Locality</Text>
            <TextInput
              style={styles.input}
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Banjara Hills, Madhapur"
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Step 2 — Photos</Text>
            <Text style={styles.stepHint}>Add up to 5 photos. First photo is the cover.</Text>

            <View style={styles.photoGrid}>
              {images.map((uri, i) => (
                <View key={uri} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Step 3 — Contact</Text>
            <Text style={styles.stepHint}>Posting in {cityName}</Text>

            <Text style={styles.label}>WhatsApp Number *</Text>
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
            <Text style={styles.hint}>Buyers will contact you via WhatsApp.</Text>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              if (step === 1 && !validateStep1()) return;
              setStep(s => s + 1);
            }}
          >
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
            {loading
              ? <Text style={styles.nextBtnText}>{uploadProgress || 'Posting...'}</Text>
              : <Text style={styles.nextBtnText}>Post Listing</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  stepIndicator: { fontSize: 13, color: '#9ca3af' },
  progressBg: { height: 3, backgroundColor: '#f3f4f6' },
  progressBar: { height: 3, backgroundColor: '#f97316' },
  body: { padding: 16, paddingBottom: 24 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  stepHint: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 8 },
  catCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catCardActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 10, color: '#6b7280', marginTop: 3, textAlign: 'center' },
  catLabelActive: { color: '#f97316', fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { position: 'relative' },
  photo: { width: 90, height: 90, borderRadius: 10 },
  removePhoto: { position: 'absolute', top: -8, right: -8 },
  addPhoto: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoText: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  countryCode: { fontSize: 15, marginRight: 6, color: '#374151' },
  phoneInput: { flex: 1, fontSize: 16, paddingVertical: 11, letterSpacing: 0.5 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  nextBtn: { backgroundColor: '#f97316', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#fdba74' },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  gateTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  gateText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  gateBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  gateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  successEmoji: { fontSize: 56 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8 },
  successText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  doneBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
