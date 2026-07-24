import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, Modal, TextInput, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../lib/api';
import { storage } from '../lib/storage';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

const BADGE_PLANS = [
  { key: 'monthly',   label: '1 Month',   price: 499,  days: 30, popular: false },
  { key: 'quarterly', label: '3 Months',  price: 1299, days: 90, popular: true  },
];

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
      theme: { color: "#2563eb" },
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

export default function BusinessDetailScreen({ route, navigation }: any) {
  const { businessId } = route.params ?? {};
  const [business, setBusiness]         = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [currentUser, setCurrentUser]   = useState<any>(null);

  const [badgePlan, setBadgePlan]             = useState<'monthly' | 'quarterly'>('monthly');
  const [badgeModalVisible, setBadgeModal]    = useState(false);
  const [paying, setPaying]                   = useState(false);
  const [webviewVisible, setWebviewVisible]   = useState(false);
  const [webviewHtml, setWebviewHtml]         = useState('');
  const orderRef = useRef<{ order_id: string; amount: number; currency: string } | null>(null);

  const [reviewRating, setReviewRating]         = useState(5);
  const [reviewBody, setReviewBody]             = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => { load(); }, [businessId]);

  // Right after creating a business (PostScreen passes promptVerify), surface
  // the Get Verified offer immediately instead of only being discoverable if
  // the owner comes back to their listing later.
  useEffect(() => {
    if (route.params?.promptVerify && business && !business.verified) {
      setBadgeModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const load = async () => {
    setLoading(true);
    try {
      const [biz, user] = await Promise.all([
        businessesApi.getById(businessId),
        storage.getUser(),
      ]);
      setBusiness(biz);
      setCurrentUser(user);
    } catch {
      Alert.alert('Error', 'Could not load business details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBadgePay = async () => {
    setPaying(true);
    try {
      const user = await storage.getUser();
      const orderData = await businessesApi.createBadgeOrder(businessId, badgePlan);
      orderRef.current = { order_id: orderData.order_id, amount: orderData.amount, currency: orderData.currency ?? 'INR' };
      const plan = BADGE_PLANS.find(p => p.key === badgePlan)!;
      setWebviewHtml(buildRazorpayHTML({
        key: RAZORPAY_KEY,
        amount: orderData.amount,
        currency: orderData.currency ?? 'INR',
        order_id: orderData.order_id,
        name: 'LocalsIndia',
        description: `Verified Badge: ${plan.label}`,
        contact: user?.phone ?? '',
        email: user?.email ?? '',
        userName: user?.name ?? '',
      }));
      setBadgeModal(false);
      setWebviewVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Could not start payment. Try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    let data: any;
    try { data = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (data.type === 'CANCELLED') { setWebviewVisible(false); return; }
    if (data.type === 'FAILED') {
      setWebviewVisible(false);
      Alert.alert('Payment Failed', data.description ?? 'The payment was not completed.');
      return;
    }
    if (data.type === 'SUCCESS') {
      setWebviewVisible(false);
      setPaying(true);
      try {
        await businessesApi.verifyBadge({
          razorpay_order_id:   data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature:  data.razorpay_signature,
          business_id:         businessId,
          plan:                badgePlan,
        });
        Alert.alert(
          "You're Verified! ✓",
          'Your blue verification badge is now live.',
          [{ text: 'Great!', onPress: load }]
        );
      } catch (err: any) {
        Alert.alert('Verification Error', err?.response?.data?.detail ?? 'Contact support.');
      } finally {
        setPaying(false);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewBody.trim()) {
      Alert.alert('Add a review', 'Please write a few words about your experience.');
      return;
    }
    setSubmittingReview(true);
    try {
      await businessesApi.submitReview(businessId, { rating: reviewRating, body: reviewBody.trim() });
      setReviewBody('');
      setReviewRating(5);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={{ color: '#6b7280' }}>Business not found.</Text>
      </View>
    );
  }

  const isOwner = !!(currentUser && business.owner_id && currentUser.id === business.owner_id);
  const selectedPlan = BADGE_PLANS.find(p => p.key === badgePlan)!;

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
        <Text style={styles.headerTitle} numberOfLines={1}>{business.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Photo gallery */}
        {business.images?.length > 0 && (
          <>
            <Image source={{ uri: business.images[0].url }} style={styles.coverPhoto} />
            {business.images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={{ gap: 8 }}>
                {business.images.map((img: any) => (
                  <Image key={img.id} source={{ uri: img.url }} style={styles.thumbPhoto} />
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Business info card */}
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {business.category && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{business.category}</Text>
            </View>
          )}

          {business.avg_rating != null && (
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= Math.round(business.avg_rating) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
              ))}
              <Text style={styles.ratingText}>
                {Number(business.avg_rating).toFixed(1)} · {(business.reviews ?? []).length} reviews
              </Text>
            </View>
          )}

          {business.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text style={styles.infoText}>{business.address}</Text>
            </View>
          )}

          {business.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${business.phone}`)}>
              <Ionicons name="call-outline" size={16} color="#6b7280" />
              <Text style={[styles.infoText, { color: '#2563eb' }]}>{business.phone}</Text>
            </TouchableOpacity>
          )}

          {business.website && (
            <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(business.website)}>
              <Ionicons name="globe-outline" size={16} color="#6b7280" />
              <Text style={[styles.infoText, { color: '#2563eb' }]} numberOfLines={1}>{business.website}</Text>
            </TouchableOpacity>
          )}

          {business.verified && business.badge_expires_at && (
            <View style={[styles.infoRow, styles.expiryRow]}>
              <Ionicons name="time-outline" size={15} color="#2563eb" />
              <Text style={styles.expiryText}>
                Badge valid until {new Date(business.badge_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>

        {/* WhatsApp CTA */}
        {business.whatsapp_url && (
          <TouchableOpacity style={styles.waBtn} onPress={() => Linking.openURL(business.whatsapp_url)} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={20} color="white" />
            <Text style={styles.waBtnText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Get Verified CTA — owner, not yet verified */}
        {isOwner && !business.verified && (
          <TouchableOpacity style={styles.verifyCta} onPress={() => setBadgeModal(true)} activeOpacity={0.85}>
            <View style={styles.verifyCtaInner}>
              <View style={styles.verifyCtaIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyCtaTitle}>Get Verified</Text>
                <Text style={styles.verifyCtaDesc}>Show the blue ✓ badge and rank higher in search. Starts at ₹499/month.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2563eb" />
            </View>
          </TouchableOpacity>
        )}

        {/* Renew CTA — owner, already verified */}
        {isOwner && business.verified && (
          <TouchableOpacity style={[styles.verifyCta, styles.renewCta]} onPress={() => setBadgeModal(true)} activeOpacity={0.85}>
            <View style={styles.verifyCtaInner}>
              <View style={[styles.verifyCtaIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifyCtaTitle, { color: '#065f46' }]}>Renew Verified Badge</Text>
                <Text style={[styles.verifyCtaDesc, { color: '#047857' }]}>Extend your verification to keep the blue badge.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
            </View>
          </TouchableOpacity>
        )}

        {/* Reviews */}
        <Text style={styles.sectionLabel}>Reviews</Text>

        {/* Write a review — logged in, not owner */}
        {currentUser && !isOwner && (
          <View style={styles.reviewForm}>
            <Text style={styles.reviewFormLabel}>Write a review</Text>
            <View style={styles.starRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setReviewRating(s)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${s} star${s !== 1 ? 's' : ''}`}
                  accessibilityState={{ selected: s <= reviewRating }}
                >
                  <Ionicons name={s <= reviewRating ? 'star' : 'star-outline'} size={30} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              placeholderTextColor="#9ca3af"
              value={reviewBody}
              onChangeText={setReviewBody}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.submitReviewBtn, submittingReview && { opacity: 0.6 }]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.submitReviewText}>Submit Review</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Review list */}
        {(business.reviews ?? []).length === 0 ? (
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbubble-outline" size={36} color="#d1d5db" />
            <Text style={styles.emptyReviewsText}>No reviews yet. Be the first!</Text>
          </View>
        ) : (
          (business.reviews as any[]).map((r: any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{(r.user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewerName}>{r.user?.name ?? 'User'}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color="#f59e0b" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              {r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Badge plan modal */}
      <Modal visible={badgeModalVisible} transparent animationType="slide" onRequestClose={() => setBadgeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose a Verification Plan</Text>
            <Text style={styles.modalSubtitle}>
              Your business is already live. Add the blue ✓ badge to rank higher in search results, or skip — you can always get verified later from your business page.
            </Text>

            {BADGE_PLANS.map(plan => (
              <TouchableOpacity
                key={plan.key}
                style={[styles.planCard, badgePlan === plan.key && styles.planCardActive]}
                onPress={() => setBadgePlan(plan.key as any)}
                activeOpacity={0.8}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Best Value</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View style={[styles.radio, badgePlan === plan.key && styles.radioActive]}>
                    {badgePlan === plan.key && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planLabel}>{plan.label}</Text>
                    <Text style={styles.planDesc}>{plan.days} days of verified badge</Text>
                  </View>
                  <Text style={styles.planPrice}>₹{plan.price}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.payBtn, paying && { opacity: 0.6 }]}
              onPress={handleBadgePay}
              disabled={paying}
              activeOpacity={0.85}
            >
              {paying ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="white" />
                  <Text style={styles.payBtnText}>Get Verified for ₹{selectedPlan.price}</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.secureNote}>🔒 Powered by Razorpay · Secure payment</Text>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBadgeModal(false)}>
              <Text style={styles.cancelBtnText}>Skip for now — my business is already listed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Razorpay WebView */}
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
                <ActivityIndicator color="#2563eb" size="large" />
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
  container:  { flex: 1, backgroundColor: '#f9fafb' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: '#1f2937',
    flex: 1, textAlign: 'center', marginHorizontal: 12,
  },

  body: { padding: 16, gap: 12 },

  coverPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: '#e5e7eb' },
  thumbRow: { flexGrow: 0 },
  thumbPhoto: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#e5e7eb' },

  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 18, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  businessName: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  categoryChip: {
    alignSelf: 'flex-start', backgroundColor: '#f3f4f6',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#6b7280', marginLeft: 4 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText:  { fontSize: 14, color: '#374151', flex: 1 },
  expiryRow: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 8, marginTop: 4 },
  expiryText: { fontSize: 13, color: '#1d4ed8', flex: 1 },

  waBtn: {
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#25D366', shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  waBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  verifyCta: {
    borderRadius: 14, borderWidth: 2, borderColor: '#bfdbfe', backgroundColor: '#eff6ff',
    overflow: 'hidden',
  },
  renewCta: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  verifyCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  verifyCtaIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  verifyCtaTitle: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  verifyCtaDesc:  { fontSize: 12, color: '#3b82f6', marginTop: 2 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
  },

  reviewForm: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1, gap: 12,
  },
  reviewFormLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  starRow: { flexDirection: 'row', gap: 6 },
  reviewInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827',
    textAlignVertical: 'top', minHeight: 80,
  },
  submitReviewBtn: {
    backgroundColor: '#f97316', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  submitReviewText: { color: 'white', fontWeight: '700', fontSize: 14 },

  emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyReviewsText: { color: '#9ca3af', fontSize: 14 },

  reviewCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: 'white', fontWeight: '700', fontSize: 14 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  reviewDate:   { fontSize: 12, color: '#9ca3af' },
  reviewBody:   { fontSize: 14, color: '#374151', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 14,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 4 },
  modalTitle:    { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  planCard: {
    backgroundColor: '#f9fafb', borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: '#e5e7eb',
    position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  popularBadge: {
    alignSelf: 'flex-start', marginBottom: 10,
    backgroundColor: '#2563eb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  popularText: { color: 'white', fontSize: 10, fontWeight: '700' },
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#2563eb' },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },
  planLabel:   { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  planDesc:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  planPrice:   { fontSize: 20, fontWeight: '900', color: '#2563eb' },

  payBtn: {
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  payBtnText:  { color: 'white', fontWeight: '800', fontSize: 16 },
  secureNote:  { textAlign: 'center', color: '#9ca3af', fontSize: 12 },
  cancelBtn:   { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },

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
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0f1c', gap: 12,
  },
  webviewLoadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});
