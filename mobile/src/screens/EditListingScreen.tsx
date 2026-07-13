import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listingsApi } from '../lib/api';
import { storage } from '../lib/storage';

export default function EditListingScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { listingId } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [listing, user] = await Promise.all([listingsApi.getById(listingId), storage.getUser()]);
        if (listing.user_id !== user?.id) {
          Alert.alert('Not authorised', 'You can only edit your own listings.');
          navigation.goBack();
          return;
        }
        setTitle(listing.title);
        setDescription(listing.description);
        setPrice(listing.price != null ? String(listing.price) : '');
        setArea(listing.area ?? '');
        setWhatsappUrl(listing.whatsapp_url ?? '');
        setWebsiteUrl(listing.website_url ?? '');
        setSocialUrl(listing.social_url ?? '');
      } catch {
        Alert.alert('Error', 'Could not load this listing.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, navigation]);

  const handleSave = async () => {
    if (title.trim().length < 3) { Alert.alert('Title too short', 'Enter at least 3 characters.'); return; }
    if (description.trim().length < 10) { Alert.alert('Description too short', 'Enter at least 10 characters.'); return; }
    setSaving(true);
    try {
      await listingsApi.update(listingId, {
        title: title.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : undefined,
        area: area.trim() || undefined,
        whatsapp_url: whatsappUrl.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        social_url: socialUrl.trim() || undefined,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={150} placeholder="e.g. Sony Bravia 55 inch 4K TV" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Describe the item, condition, reason for selling..."
          />

          <Text style={styles.label}>Price (₹) — optional</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Leave blank for price on request" />

          <Text style={styles.label}>Area / Neighbourhood — optional</Text>
          <TextInput style={styles.input} value={area} onChangeText={setArea} maxLength={100} placeholder="e.g. Koramangala, Banjara Hills..." />

          <Text style={styles.label}>WhatsApp URL — optional</Text>
          <TextInput style={styles.input} value={whatsappUrl} onChangeText={setWhatsappUrl} autoCapitalize="none" placeholder="https://wa.me/91XXXXXXXXXX" />

          <Text style={styles.label}>Website — optional</Text>
          <TextInput style={styles.input} value={websiteUrl} onChangeText={setWebsiteUrl} autoCapitalize="none" placeholder="https://yourwebsite.com" />

          <Text style={styles.label}>Social link — optional</Text>
          <TextInput style={styles.input} value={socialUrl} onChangeText={setSocialUrl} autoCapitalize="none" placeholder="instagram.com/... or facebook.com/..." />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1f2937',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  saveBtn: {
    marginTop: 28, backgroundColor: '#f97316', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
