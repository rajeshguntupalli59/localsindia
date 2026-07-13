import Link from 'next/link';
import { Mail, MessageCircle, Clock } from 'lucide-react';

export const metadata = { title: 'Contact Us — LocalsIndia' };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-[#0D0F1C] py-20">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="text-sm font-semibold mb-10 inline-block text-[#F7921E]">
            ← Back to LocalsIndia
          </Link>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Contact Us
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
            Questions, feedback, partnerships, or just want to say hello — we read every message.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-6">

        {/* Email card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Mail className="w-5 h-5 text-[#F7921E]" strokeWidth={1.8} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Email Us</h2>
          <p className="text-sm text-slate-500 mb-4">
            For general enquiries, listing issues, account help, or partnerships.
          </p>
          <a
            href="mailto:support@localsindia.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F7921E] hover:bg-[#E07B0A] transition-colors"
          >
            support@localsindia.com
          </a>
        </div>

        {/* WhatsApp card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={1.8} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">WhatsApp</h2>
          <p className="text-sm text-slate-500 mb-4">
            Quickest way to reach us for urgent listing or account issues.
          </p>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#25D366' }}
          >
            Chat on WhatsApp
          </a>
        </div>

        {/* Response time */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-blue-500" strokeWidth={1.8} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Response Time</h2>
          <p className="text-sm text-slate-500">
            We typically reply within <strong className="text-slate-700">24 hours</strong> on business days.
            For listing approvals, expect a response within a few hours during daytime IST.
          </p>
        </div>

      </div>
    </div>
  );
}
