'use client';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { MessageCircle, X, Send, ChevronRight, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { chatSuggestions, cityNameFromSlug } from '@/lib/chatSuggestions';

interface ListingSnippet {
  id: string;
  title: string;
  price: number | null;
  city_slug: string | null;
  whatsapp_url: string | null;
}

interface BusinessSnippet {
  id: string;
  name: string;
  locality: string | null;
  phone: string | null;
  city_slug: string;
  type_name: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  listings?: ListingSnippet[];
  businesses?: BusinessSnippet[];
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hi! I'm the LocalsIndia assistant. Ask me to find doctors, shops and services near you, things for sale, or anything about the site.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://localsindia-backend-in.azurewebsites.net';

// The greeting card shows once per visitor, until they use it or close it
const PEEK_KEY = 'li_chat_peek';
const PEEK_DELAY_MS = 3000;
const CITY_SLUG = /^[a-z0-9-]+$/;
const readStore = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeStore = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [peek, setPeek] = useState(false);
  const [citySlug, setCitySlug] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const noPeek = !!pathname && (pathname.startsWith('/auth') || pathname.startsWith('/admin'));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Greeting card a few seconds after the page loads — once per visitor
  useEffect(() => {
    setCitySlug(readStore('li_city'));
    if (noPeek || readStore(PEEK_KEY)) return;
    const t = setTimeout(() => setPeek(true), PEEK_DELAY_MS);
    return () => clearTimeout(t);
  }, [noPeek]);

  if (pathname?.startsWith('/auth')) return null;

  const suggestions = chatSuggestions(citySlug);
  const cityName = citySlug && CITY_SLUG.test(citySlug) ? cityNameFromSlug(citySlug) : null;

  function closePeek() {
    setPeek(false);
    writeStore(PEEK_KEY, 'closed');
  }

  function toggleChat() {
    if (peek) { setPeek(false); writeStore(PEEK_KEY, 'used'); }
    setOpen(v => !v);
  }

  function ask(question: string) {
    setPeek(false);
    writeStore(PEEK_KEY, 'used');
    setOpen(true);
    void sendText(question);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    await sendText(input);
  }

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || loading) return;

    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, city_slug: citySlug ?? undefined, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        listings: data.listings ?? undefined,
        businesses: data.businesses ?? undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-[340px] sm:w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">LocalsIndia Assistant</p>
                  <p className="text-orange-100 text-[11px] mt-0.5">Powered by AI · Ask anything</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[82%] space-y-2">
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.listings?.map(l => (
                      <div key={l.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
                        <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{l.title}</p>
                        <p className="text-[12px] text-orange-500 font-bold mt-0.5">
                          {l.price ? `₹${l.price.toLocaleString('en-IN')}` : 'Price on request'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {l.whatsapp_url && (
                            <a
                              href={l.whatsapp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center text-[11px] bg-[#25D366] text-white rounded-lg py-1 font-medium"
                            >
                              WhatsApp
                            </a>
                          )}
                          {l.city_slug && (
                            <Link
                              href={`/${l.city_slug}/classifieds/${l.id}`}
                              className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-orange-500 whitespace-nowrap"
                            >
                              View <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    {msg.businesses?.map(b => (
                      <div key={b.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
                        <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{b.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {[b.locality, b.type_name].filter(Boolean).join(' · ') || 'Local business'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {b.phone && (
                            <a
                              href={`tel:${b.phone}`}
                              className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-orange-500 text-white rounded-lg py-1 font-medium"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </a>
                          )}
                          <Link
                            href={`/${b.city_slug}/businesses/${b.id}`}
                            className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-orange-500 whitespace-nowrap"
                          >
                            View <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* One-tap questions until the visitor asks something */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {suggestions.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendText(q)}
                      className="text-[12px] px-2.5 py-1 rounded-full border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="p-3 border-t border-slate-100 bg-white shrink-0 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Greeting card — small, beside the icon, never covers the page */}
      <AnimatePresence>
        {peek && !open && !noPeek && (
          <motion.div
            role="dialog"
            aria-label="Chat assistant suggestions"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="relative w-[260px] bg-white rounded-2xl shadow-xl border border-slate-100 p-3.5"
          >
            <button
              type="button"
              onClick={closePeek}
              aria-label="Close"
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-slate-800 pr-5 leading-snug">
              👋 Need help finding something{cityName ? ` in ${cityName}` : ''}?
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">Ask our assistant, it&apos;s free.</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="text-left text-[13px] px-3 py-1.5 rounded-xl border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center transition-colors"
        aria-label="Open chat assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
