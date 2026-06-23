'use client';

import { Home, Search, Plus, List, User, LogIn } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefs } from '@/context/PrefsContext';
import { setCitySlug } from '@/lib/prefs';

interface Props {
  citySlug: string;
}

export default function BottomNav({ citySlug }: Props) {
  const pathname = usePathname();
  const { t } = usePrefs();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'));
    // Auto-save city so login redirect always comes back here
    if (citySlug) setCitySlug(citySlug);
  }, [pathname, citySlug]);

  const items = [
    { icon: Home,   label: t('bottomNav.home'),       href: `/${citySlug}` },
    { icon: Search, label: t('bottomNav.search'),     href: `/${citySlug}/search` },
    { icon: Plus,   label: t('bottomNav.post'),       href: `/${citySlug}/classifieds/post`, featured: true },
    { icon: List,   label: t('bottomNav.myListings'), href: '/profile/listings' },
    isLoggedIn
      ? { icon: User,    label: t('bottomNav.profile'), href: '/profile' }
      : { icon: LogIn,   label: t('bottomNav.signUp'),  href: '/auth/login?mode=signup' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb"
      style={{
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.07)',
      }}
    >
      <div className="flex items-end">
        {items.map(({ icon: Icon, label, href, featured }) => {
          const isActive = pathname === href || (href !== `/${citySlug}` && pathname.startsWith(href) && !featured);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 pb-2 text-xs relative',
                featured ? 'pt-0' : 'pt-3',
              )}
            >
              {/* Active indicator pill at top */}
              {isActive && !featured && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full"
                  style={{ background: 'var(--li-primary)' }}
                  aria-hidden
                />
              )}

              {featured ? (
                /* Post button — floating elevated circle with glow */
                <span
                  className="-mt-6 w-[54px] h-[54px] rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FA9A30 0%, #F7921E 60%, #E07B0A 100%)',
                    boxShadow: '0 4px 20px rgba(247,146,30,0.55), 0 2px 8px rgba(247,146,30,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </span>
              ) : (
                <Icon
                  className={cn('w-5 h-5 transition-colors duration-150', isActive ? 'stroke-[2.5]' : 'stroke-2')}
                  style={{ color: isActive ? 'var(--li-primary)' : '#94a3b8' }}
                />
              )}

              <span
                className="transition-colors duration-150 leading-none text-[10.5px]"
                style={{
                  color: featured ? 'var(--li-primary)' : isActive ? 'var(--li-primary)' : '#94a3b8',
                  fontWeight: isActive || featured ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
