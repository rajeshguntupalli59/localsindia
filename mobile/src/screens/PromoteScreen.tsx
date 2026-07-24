import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { paymentsApi } from '../lib/api';
import { storage } from '../lib/storage';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

const PLANS = [
  { id: 'week',  label: '1 Week Boost',  price: 99,  desc: 'Top placement for 7 days' },
  { id: 'month', label: '1 Month Boost', price: 199, desc: 'Top placement for 30 days', popular: true },
];

function buildRazorpayHTML(options: {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string; contact: string; email: string; userName: string;
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { margin:0; background:#0d0f1c; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .loading { color:white; font-family:sans-serif; font-size:16px; }
  </style>
</head>
<body>
  <div class="loading">Opening payment...</div>
  <script>
    var options = {
      key: "${options.key}",
      amount: ${options.amount},
      currency: "${options.currency}",
      order_id: "${options.order_id}",
      name: "${options.name}",
      description: "${options.description}",
      prefill: {
        contact: "${options.contact}",
        email: "${options.email}",
        name: "${options.userName}"
      },
      theme: { color: "#f97316" },
      modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "CANCELLED" })); } },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "SUCCESS",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        }));
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "FAILED",
        description: response.error.description
      }));
    });
    setTimeout(function() { rzp.open(); }, 300);
  </script>
</body>
</html>`;
}

export default function PromoteScreen({ route, navigation }: any) {
  const { listingId, listingTitle } = route.params ?? {};
  const [selected, setSelected] = useState<'week' | 'month'>('month');
  const [paying, setPaying] = useState(false);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [webviewHtml, setWebviewHtml] = useState('');
  const orderRef = useRef<{ order_id: string; amount: number; currency: string } | null>(null);

  const plan = PLANS.find(p => p.id === selected)!;

  const handlePromote = async () => {
    setPaying(true);
    try {
      const user = await storage.getUser();
      const orderData = await paymentsApi.createOrder(listingId, selected);
      orderRef.current = {
        order_id: orderData.order_id,
        amount: orderData.amount,
        currency: orderData.currency ?? 'INR',
      };

      const html = buildRazorpayHTML({
        key: RAZORPAY_KEY,
        amount: orderData.amount,
        currency: orderData.currency ?? 'INR',
        order_id: orderData.order_id,
        name: 'LocalsIndia',
        description: `Promote: ${listingTitle ?? 'Listing'}`,
        contact: user?.phone ?? '',
        email: user?.email ?? '',
        userName: user?.name ?? '',
      });

      setWebviewHtml(html);
      setWebviewVisible(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Could not start payment. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setPaying(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    let data: any;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (data.type === 'CANCELLED') {
      setWebviewVisible(false);
      return;
    }

    if (data.type === 'FAILED') {
      setWebviewVisible(false);
      Alert.alert('Payment Failed', data.description ?? 'The payment was not completed.');
      return;
    }

    if (data.type === 'SUCCESS') {
      setWebviewVisible(false);
      setPaying(true);
      try {
        await paymentsApi.verify({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          listing_id: listingId,
          plan: selected,
        });
        Alert.alert(
          'Listing Promoted! ⭐',
          'Your listing is now featured at the top of search results.',
          [{ text: 'Great!', onPress: () => navigation.goBack() }]
        );
      } catch (err: any) {
        const msg = err?.response?.data?.detail ?? 'Verification failed. Contact support.';
        Alert.alert('Verification Error', msg);
      } finally {
        setPaying(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promote Listing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Listing info */}
        <View style={styles.listingCard}>
          <Ionicons name="megaphone-outline" size={28} color="#f97316" />
          <View style={{ flex: 1 }}>
            <Text style={styles.listingTitle} numberOfLines={2}>{listingTitle ?? 'Your listing'}</Text>
            <Text style={styles.listingMeta}>Promoting will place it at the top of search results</Text>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          {[
            { icon: 'rocket-outline', text: 'Top of search results in your city' },
            { icon: 'star-outline', text: 'Featured badge — stands out visually' },
            { icon: 'eye-outline', text: '5x more views than standard listings' },
            { icon: 'shield-checkmark-outline', text: 'Verified featured placement' },
          ].map(b => (
            <View key={b.text} style={styles.benefit}>
              <Ionicons name={b.icon as any} size={16} color="#f97316" />
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionLabel}>Choose a plan</Text>
        {PLANS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.planCard, selected === p.id && styles.planCardActive]}
            onPress={() => setSelected(p.id as 'week' | 'month')}
            activeOpacity={0.8}
          >
            {p.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most popular</Text>
              </View>
            )}
            <View style={styles.planRow}>
              <View style={[styles.radio, selected === p.id && styles.radioActive]}>
                {selected === p.id && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>{p.label}</Text>
                <Text style={styles.planDesc}>{p.desc}</Text>
              </View>
              <Text style={styles.planPrice}>₹{p.price}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Pay button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, paying && { opacity: 0.6 }]}
          onPress={handlePromote}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="white" />
              <Text style={styles.payBtnText}>Promote for ₹{plan.price}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureNote}>🔒 Powered by Razorpay · Secure payment</Text>
      </View>

      {/* Razorpay WebView Modal */}
      <Modal visible={webviewVisible} animationType="slide" onRequestClose={() => setWebviewVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f1c' }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity
              onPress={() => setWebviewVisible(false)}
              style={styles.webviewClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close payment window"
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>Secure Payment</Text>
            <View style={{ width: 36 }} />
          </View>
          <WebView
            source={{ html: webviewHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator color="#f97316" size="large" />
                <Text style={styles.webviewLoadingText}>Loading payment...</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },

  body: { padding: 16 },

  listingCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  listingTitle: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 22 },
  listingMeta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  benefitsCard: {
    backgroundColor: '#fff7ed', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#fed7aa', marginBottom: 20, gap: 10,
  },
  benefit: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  benefitText: { fontSize: 13, color: '#7c2d12', flex: 1 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  planCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  popularBadge: {
    alignSelf: 'flex-start', marginBottom: 10,
    backgroundColor: '#f97316', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  popularText: { color: 'white', fontSize: 10, fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#f97316' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f97316' },
  planLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  planDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  planPrice: { fontSize: 20, fontWeight: '900', color: '#f97316' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  payBtn: {
    backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f97316', shadowOpacity: 0.45, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  payBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  secureNote: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 10 },

  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  webviewClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  webviewTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0f1c', gap: 12,
  },
  webviewLoadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});
