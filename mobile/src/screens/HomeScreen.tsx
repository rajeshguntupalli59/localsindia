import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, FlatList, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi, citiesApi } from '../lib/api';
import { storage } from '../lib/storage';
import ListingCard from '../components/ListingCard';

const LOGO = require('../../assets/logo-mark-transparent.png');

const TRENDING = ['Tiffin Service', 'PG for Boys', 'Used Laptop', 'Honda Activa', 'Home Tutor'];
const CATEGORIES = [
  { label: 'Tiffin', slug: 'tiffin', emoji: '🍱' },
  { label: 'PG / Rooms', slug: 'pg-roommate', emoji: '🏠' },
  { label: 'Jobs', slug: 'jobs', emoji: '💼' },
  { label: 'Vehicles', slug: 'vehicles', emoji: '🚗' },
  { label: 'Electronics', slug: 'electronics', emoji: '📱' },
  { label: 'Education', slug: 'education', emoji: '📚' },
  { label: 'Events', slug: 'events', emoji: '🎉' },
  { label: 'Businesses', slug: 'businesses', emoji: '🏪' },
  { label: 'Doctors', slug: 'doctors', emoji: '🩺' },
];

type Listing = any;

export default function HomeScreen({ navigation }: any) {
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [cityName, setCityName] = useState('Hyderabad');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    storage.getCity().then(saved => {
      if (saved) { setCitySlug(saved.slug); setCityName(saved.name); }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    listingsApi.byCitySlug(citySlug, { page_size: '8' })
      .then(data => setListings(data))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [citySlug]);

  const handleCitySelect = (c: any) => {
    setCitySlug(c.slug);
    setCityName(c.name);
    storage.setCity(c.slug, c.name);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.heroTitle}>Buy. Sell. Connect.</Text>
              <Text style={styles.heroCity}>In {cityName}.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cityBtn}
            onPress={() => navigation.navigate('CityPicker', { onSelect: handleCitySelect })}
          >
            <Ionicons name="location-outline" size={14} color="#f97316" />
            <Text style={styles.cityBtnText}>{cityName}</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', { citySlug, cityName })}
        >
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>Search tiffin, PG, tutor...</Text>
        </TouchableOpacity>

        {/* Trending chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {TRENDING.map(t => (
            <TouchableOpacity
              key={t}
              style={styles.chip}
              onPress={() => navigation.navigate('Search', { citySlug, cityName, q: t })}
            >
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <Text style={styles.sectionTitle}>Browse by Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.slug}
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Search', { citySlug, cityName, categorySlug: cat.slug })}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fresh listings */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fresh Near You</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search', { citySlug, cityName })}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {listings.map(l => (
          <ListingCard
            key={l.id}
            listing={l}
            onPress={() => navigation.navigate('ListingDetail', { id: l.id })}
          />
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>

    {/* Floating chat button */}
    <TouchableOpacity
      style={styles.chatFab}
      onPress={() => navigation.navigate('Chat')}
      activeOpacity={0.85}
    >
      <Ionicons name="chatbubble-ellipses" size={22} color="white" />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  hero: { backgroundColor: '#111827', padding: 20, paddingTop: 60, paddingBottom: 24 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logo: { width: 38, height: 38, marginRight: 10 },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  heroCity: { color: '#f97316', fontSize: 26, fontWeight: 'bold' },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cityBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 13,
  },
  searchPlaceholder: { color: '#9ca3af', fontSize: 15 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { color: 'white', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
  viewAll: { color: '#f97316', fontWeight: '600', fontSize: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  categoryCard: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryEmoji: { fontSize: 38, marginBottom: 8 },
  categoryLabel: { fontSize: 12, textAlign: 'center', color: '#374151', fontWeight: '500' },
  chatFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
