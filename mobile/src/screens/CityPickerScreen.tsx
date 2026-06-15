import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { citiesApi } from '../lib/api';

export default function CityPickerScreen({ navigation, route }: any) {
  const { onSelect } = route.params ?? {};
  const [cities, setCities] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    citiesApi.list()
      .then(data => { setCities(data); setFiltered(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(q ? cities.filter(c => c.name.toLowerCase().includes(q) || c.state?.toLowerCase().includes(q)) : cities);
  }, [query, cities]);

  const handleSelect = (city: any) => {
    if (typeof onSelect === 'function') onSelect(city);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search your city..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.slug}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cityRow} onPress={() => handleSelect(item)}>
              <View style={styles.cityIcon}>
                <Ionicons name="location" size={16} color="#f97316" />
              </View>
              <View>
                <Text style={styles.cityName}>{item.name}</Text>
                {item.state && <Text style={styles.stateName}>{item.state}</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No cities found for "{query}"</Text>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  backBtn: { padding: 4 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  cityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  stateName: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f9fafb' },
  emptyText: { textAlign: 'center', color: '#9ca3af', paddingTop: 40, paddingHorizontal: 24 },
});
