import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../lib/storage';

const API_BASE = 'https://localsindia-backend-in.azurewebsites.net/api/v1';

interface ListingSnippet {
  id: string;
  title: string;
  price: number | null;
  city_slug: string | null;
  whatsapp_url: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  listings?: ListingSnippet[];
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm the LocalsIndia assistant 👋\n\nAsk me to find listings (e.g. \"PG in Hyderabad under ₹7000\") or ask anything about the app!",
};

export default function ChatScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [citySlug, setCitySlug] = useState<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    storage.getCity().then(c => { if (c) setCitySlug(c.slug); });
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, city_slug: citySlug, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        listings: data.listings ?? undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>LocalsIndia Assistant</Text>
          <Text style={styles.headerSub}>AI-powered · Ask anything</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
            <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                {msg.content}
              </Text>
            </View>
            {msg.listings?.map(l => (
              <View key={l.id} style={styles.listingCard}>
                <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.listingPrice}>
                  {l.price ? `₹${l.price.toLocaleString('en-IN')}` : 'Price on request'}
                </Text>
                <View style={styles.listingActions}>
                  {l.whatsapp_url && (
                    <TouchableOpacity
                      style={styles.waBtn}
                      onPress={() => Linking.openURL(l.whatsapp_url!)}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="white" />
                      <Text style={styles.waBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  {l.city_slug && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ListingDetail', { id: l.id })}
                    >
                      <Text style={styles.viewLink}>View →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {loading && (
          <View style={styles.msgRow}>
            <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything..."
          placeholderTextColor="#9ca3af"
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
          accessibilityLabel="Message"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { color: 'white', fontWeight: '700', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#bbf7d0' },

  messageList: { flex: 1 },
  msgRow: { marginBottom: 10, alignItems: 'flex-start', gap: 6 },
  msgRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 10 },
  bubbleBot: { backgroundColor: 'white', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bubbleUser: { backgroundColor: '#f97316', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  bubbleTextUser: { color: 'white' },

  listingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listingTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  listingPrice: { fontSize: 13, fontWeight: '700', color: '#f97316', marginTop: 2 },
  listingActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  waBtnText: { color: 'white', fontSize: 11, fontWeight: '600' },
  viewLink: { color: '#f97316', fontSize: 12, fontWeight: '600' },

  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
