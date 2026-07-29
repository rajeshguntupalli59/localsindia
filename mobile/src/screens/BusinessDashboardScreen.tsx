import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../lib/api';
import { C, RADIUS, SHADOW } from '../lib/theme';

type TrendPoint = { date: string; views: number; whatsapp_clicks: number };
type Analytics = {
  views_30d: number;
  whatsapp_clicks_30d: number;
  review_count: number;
  avg_rating: number;
  daily_trend: TrendPoint[];
};

export default function BusinessDashboardScreen({ route, navigation }: any) {
  const { businessId, businessName, citySlug } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    businessesApi.analytics(businessId)
      .then((d: Analytics) => { if (active) setData(d); })
      .catch((e: any) => {
        if (!active) return;
        setError(e?.response?.data?.detail ?? 'Failed to load analytics');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]));

  const maxDailyViews = Math.max(1, ...(data?.daily_trend.map(d => d.views) ?? [1]));
  const cityLabel = (citySlug ?? '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{businessName ?? 'Business Analytics'}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.orange} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>LAST 30 DAYS</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <Ionicons name="eye-outline" size={14} color={C.textMuted} />
                <Text style={styles.statLabel}>Views</Text>
              </View>
              <Text style={styles.statValue}>{data.views_30d}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
                <Text style={styles.statLabel}>WhatsApp Taps</Text>
              </View>
              <Text style={styles.statValue}>{data.whatsapp_clicks_30d}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <Ionicons name="chatbubbles-outline" size={14} color={C.textMuted} />
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <Text style={styles.statValue}>{data.review_count}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <Ionicons name="star-outline" size={14} color={C.textMuted} />
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
              <Text style={styles.statValue}>{data.avg_rating > 0 ? data.avg_rating.toFixed(1) : '—'}</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartLabel}>Views per day</Text>
            {data.daily_trend.length === 0 ? (
              <Text style={styles.chartEmpty}>No views yet in the last 30 days.</Text>
            ) : (
              <View style={styles.chartRow}>
                {data.daily_trend.map(point => (
                  <View
                    key={point.date}
                    style={[styles.chartBar, { height: `${Math.max(4, (point.views / maxDailyViews) * 100)}%` }]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <Ionicons name="megaphone-outline" size={16} color={C.orange} />
              <Text style={styles.promoEyebrow}>GET MORE VISIBILITY</Text>
            </View>
            <Text style={styles.promoText}>
              Feature your business with a banner ad on {cityLabel || 'your city'}&apos;s homepage — reach everyone browsing your city.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:support@localsindia.com?subject=Banner%20ad%20inquiry&body=Hi%2C%20I%27d%20like%20to%20advertise%20my%20business%20with%20a%20city%20banner.')}
              accessibilityRole="button"
              accessibilityLabel="Contact us to advertise"
            >
              <Text style={styles.promoLink}>Contact us to advertise →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.pageBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 12, fontSize: 15, fontWeight: '700', color: C.text },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: C.orange, letterSpacing: 1.2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 14,
    ...SHADOW.card,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  statLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },

  chartCard: { backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOW.card },
  chartLabel: { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 10 },
  chartEmpty: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 24 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 96 },
  chartBar: { flex: 1, minWidth: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: C.orange },

  promoCard: {
    backgroundColor: C.orangeLight, borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: 'rgba(247,146,30,0.2)',
  },
  promoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  promoEyebrow: { fontSize: 11, fontWeight: '700', color: C.orange, letterSpacing: 1 },
  promoText: { fontSize: 13, color: C.textSub, lineHeight: 19, marginBottom: 10 },
  promoLink: { fontSize: 13, fontWeight: '700', color: C.orange },

  errorBox: { margin: 16, backgroundColor: '#FFF5F5', borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: '#FFD6D6' },
  errorText: { fontSize: 13, color: C.danger },
});
