import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi, citiesApi } from '../lib/api';

export default function PostBusinessScreen({ route, navigation }: any) {
  const { citySlug, cityName } = route.params ?? {};
  const [cityId, setCityId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    citiesApi.get(citySlug).then(c => setCityId(c.id)).catch(() => {});
  }, [citySlug]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Business name required', 'Please enter your business name.');
      return;
    }
    if (!cityId) {
      Alert.alert('Please wait', 'Still loading city info — try again in a moment.');
      return;
    }
    setSubmitting(true);
    try {
      const biz = await businessesApi.create({
        name: name.trim(),
        city_id: cityId,
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
      });
      navigation.replace('BusinessDetail', { businessId: biz.id });
    } catch {
      Alert.alert('Something went wrong', 'Failed to add business. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Business</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Get discovered by local customers in {cityName}</Text>

        <Text style={styles.label}>Business Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sri Venkateshwara Tiffin Centre"
          value={name}
          onChangeText={setName}
          maxLength={150}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What do you offer?"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Street, Area, City"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+91 9876543210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>WhatsApp URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://wa.me/919876543210"
          value={whatsappUrl}
          onChangeText={setWhatsappUrl}
          autoCapitalize="none"
        />
        <Text style={styles.hint}>Format: https://wa.me/91XXXXXXXXXX</Text>

        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://yourbusiness.com"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Add Business →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  body: { padding: 20, gap: 4, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937', backgroundColor: 'white',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
