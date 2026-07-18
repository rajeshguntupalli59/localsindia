import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi, ticketsApi } from '../lib/api';
import { storage } from '../lib/storage';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

function buildRazorpayHTML(opts: {
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
      key: "${opts.key}",
      amount: ${opts.amount},
      currency: "${opts.currency}",
      order_id: "${opts.order_id}",
      name: "${opts.name}",
      description: "${opts.description}",
      prefill: { contact: "${opts.contact}", email: "${opts.email}", name: "${opts.userName}" },
      theme: { color: "#ec4899" },
      modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: "CANCELLED" })); } },
      handler: function(r) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "SUCCESS",
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_order_id: r.razorpay_order_id,
          razorpay_signature: r.razorpay_signature
        }));
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(r) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "FAILED", description: r.error.description }));
    });
    setTimeout(function() { rzp.open(); }, 300);
  </script>
</body>
</html>`;
}

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params ?? {};
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [webviewHtml, setWebviewHtml] = useState('');

  useEffect(() => {
    eventsApi.getById(eventId)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleBuyTicket = async () => {
    setBuying(true);
    try {
      const user = await storage.getUser();
      if (!user) {
        setBuying(false);
        navigation.navigate('Login');
        return;
      }
      const order = await ticketsApi.createOrder(event.id);
      const html = buildRazorpayHTML({
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        order_id: order.order_id,
        name: 'LocalsIndia',
        description: event.title,
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
      setBuying(false);
    }
  };

  const handleWebViewMessage = async (evt: any) => {
    let data: any;
    try { data = JSON.parse(evt.nativeEvent.data); } catch { return; }

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
      setBuying(true);
      try {
        const ticket = await ticketsApi.verify({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          event_id: event.id,
        });
        navigation.replace('Ticket', { ticketId: ticket.id });
      } catch (err: any) {
        Alert.alert('Verification Error', err?.response?.data?.detail ?? 'Contact support.');
      } finally {
        setBuying(false);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#ec4899" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Event not found</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(event.event_date);
  const dateLabel = date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.badge, event.is_free ? styles.badgeFree : styles.badgePaid]}>
          {event.is_free ? 'Free' : 'Paid'}
        </Text>
        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.metaText}>{dateLabel} · {timeLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.metaText}>{event.venue}</Text>
        </View>

        <Text style={styles.description}>{event.description}</Text>

        {event.is_free ? (
          <View style={styles.freeNotice}>
            <Text style={styles.freeNoticeText}>This is a free event — just show up at the venue.</Text>
          </View>
        ) : event.ticket_price ? (
          <TouchableOpacity
            style={[styles.buyBtn, buying && { opacity: 0.6 }]}
            onPress={handleBuyTicket}
            disabled={buying}
            activeOpacity={0.85}
          >
            {buying ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="ticket-outline" size={18} color="white" />
                <Text style={styles.buyBtnText}>Buy Ticket — ₹{event.ticket_price}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : event.ticket_url ? (
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => Linking.openURL(event.ticket_url)}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={18} color="white" />
            <Text style={styles.buyBtnText}>Get Tickets</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={webviewVisible} animationType="slide" onRequestClose={() => setWebviewVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f1c' }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity onPress={() => setWebviewVisible(false)} style={styles.webviewClose}>
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
                <ActivityIndicator color="#ec4899" size="large" />
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
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', flex: 1, textAlign: 'center' },
  body: { padding: 20 },
  badge: {
    alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', marginBottom: 8,
  },
  badgeFree: { color: '#15803d', backgroundColor: '#dcfce7' },
  badgePaid: { color: '#b45309', backgroundColor: '#fef3c7' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  metaText: { fontSize: 13, color: '#6b7280' },
  description: { fontSize: 14, color: '#374151', lineHeight: 21, marginTop: 12, marginBottom: 24 },
  freeNotice: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, padding: 16 },
  freeNoticeText: { color: '#15803d', fontSize: 13, fontWeight: '600' },
  buyBtn: {
    backgroundColor: '#ec4899', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  webviewClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  webviewTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0f1c',
  },
});
