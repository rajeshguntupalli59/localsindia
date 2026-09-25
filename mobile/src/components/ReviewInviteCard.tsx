import { View, Text, TouchableOpacity, StyleSheet, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function reviewInviteText(businessName: string, url: string): string {
  return `Hi! ${businessName} is now on LocalsIndia. If you've been to us, we'd be grateful for a quick review — it helps other people nearby find us:\n${url}`;
}

// Owner-only (same as the website's ReviewInvite): the owner sends their page
// to regular customers from their own WhatsApp and asks for a review.
export default function ReviewInviteCard({ businessName, url }: { businessName: string; url: string }) {
  const text = reviewInviteText(businessName, url);
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="star" size={15} color="#f59e0b" />
        <Text style={styles.title}>Get reviews from your customers</Text>
      </View>
      <Text style={styles.body}>
        Send your page to regular customers and ask for a quick review. Ratings help you show up first — on LocalsIndia and in Google.
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.wa}
          onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={16} color="white" />
          <Text style={styles.waText}>Share on WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.more} onPress={() => Share.share({ message: text })} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={16} color="#92400e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 14, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: '#78350f' },
  body: { fontSize: 12, color: '#92400e', lineHeight: 17 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  wa: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#25D366', paddingVertical: 10, borderRadius: 10 },
  waText: { color: 'white', fontWeight: '700', fontSize: 13 },
  more: { paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', backgroundColor: 'white' },
});
