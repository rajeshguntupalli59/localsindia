import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../lib/api';
import { storage } from '../lib/storage';
import { C, SHADOW, RADIUS } from '../lib/theme';

export default function InviteScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [cityName, setCityName] = useState('your city');
  const [citySlug, setCitySlug] = useState('hyderabad');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getCity().then(c => {
      if (c) { setCityName(c.name); setCitySlug(c.slug); }
    });
    authApi.getMe()
      .then(me => setReferralCode(me?.referral_code ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inviteUrl = referralCode
    ? `https://www.localsindia.com/${citySlug}?ref=${referralCode}`
    : `https://www.localsindia.com/${citySlug}`;

  const handleShare = () => {
    Share.share({
      message: `Hey! I found this amazing free platform for local listings in ${cityName} 👇\n\n📢 LocalsIndia — India's free classifieds, WhatsApp-first\n✅ Post listings for free\n✅ No spam calls (WhatsApp only)\n✅ Works in Telugu, Hindi & more\n\nCheck it out: ${inviteUrl}`,
      title: 'Invite to LocalsIndia',
    }).catch(() => {});
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
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.orange} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.hero}>
            <Ionicons name="gift" size={32} color={C.orange} />
            <Text style={styles.heroTitle}>Invite a friend, get Featured free</Text>
            <Text style={styles.heroSub}>
              When someone you invite posts and it gets approved, your best listing
              gets Featured for {' '}3 days — free, automatic, no strings attached.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>YOUR INVITE LINK</Text>
            <Text style={styles.linkText} numberOfLines={1}>{inviteUrl}</Text>
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Share invite link"
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.shareButtonText}>Share Invite Link</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            {[
              { val: '100%', label: 'Free forever' },
              { val: '0', label: 'Spam calls' },
              { val: '8+', label: 'Languages' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.pageBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: C.orangeLight, borderRadius: RADIUS.lg, padding: 20,
    alignItems: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 10, textAlign: 'center' },
  heroSub: { fontSize: 13, color: C.textSub, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 16, ...SHADOW.card,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  linkText: { fontSize: 14, color: C.text, fontWeight: '600' },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.orange, borderRadius: RADIUS.md, height: 54,
    marginBottom: 20, ...SHADOW.orange,
  },
  shareButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.md, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: C.orange },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
});
