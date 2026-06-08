import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer style={{ background: 'var(--li-nav-bg)' }}>
      <div className="page-wrap py-14">
        <div className="grid grid-cols-4 gap-12 pb-10 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="text-2xl font-black tracking-tight text-white mb-3">
              Locals<span style={{ color: 'var(--li-primary)' }}>India</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              India&apos;s hyperlocal community platform. Buy and sell freely in your city, in your language. Powered by WhatsApp-native connections.
            </p>
            <div className="flex gap-3 mt-5">
              {['🐦', '📘', '📸', '▶️'].map((icon, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors hover:bg-white/20"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Platform
            </p>
            {['Browse Listings', 'Post Free Ad', 'All Categories', 'All Cities', 'Featured Ads'].map(l => (
              <Link
                key={l}
                href="/"
                className="block text-sm mb-3 transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Company
            </p>
            {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map(l => (
              <Link
                key={l}
                href="/"
                className="block text-sm mb-3 transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Legal
            </p>
            {['Privacy Policy', 'Terms of Service', 'Safety Tips', 'Cookie Policy'].map(l => (
              <Link
                key={l}
                href="/"
                className="block text-sm mb-3 transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {l}
              </Link>
            ))}
            <div className="mt-6 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,107,53,0.12)', color: '#FDBA74', border: '1px solid rgba(255,107,53,0.2)' }}>
              🇮🇳 Made with love for India
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>© 2026 LocalsIndia. All rights reserved.</span>
          <span>localsindia.com</span>
        </div>
      </div>
    </footer>
  );
}
