'use client';

import { Home, Search, Plus, List, User, LogIn } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefs } from '@/context/PrefsContext';

interface Props {
  citySlug: string;
}

export default function BottomNav({ citySlug }: Props) {
  const pathname = usePathname();
  const { t } = usePrefs();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'));
  }, []);

  const items = [
    { icon: Home, label: t('bottomNav.home'), href: `/${citySlug}` },
    { icon: Search, label: t('bottomNav.search'), href: `/${citySlug}/search` },
    { icon: Plus, label: t('bottomNav.post'), href: `/${citySlug}/classifieds/post`, featured: true },
    { icon: List, label: t('bottomNav.myListings'), href: '/profile/listings' },
    isLoggedIn
      ? { icon: User, label: t('bottomNav.profile'), href: '/profile' }
      : { icon: LogIn, label: t('bottomNav.signUp'), href: '/auth/login?mode=signup' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 md:hidden safe-area-pb">
      <div className="flex items-center">
        {items.map(({ icon: Icon, label, href, featured }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                featured
                  ? 'relative'
                  : isActive
                  ? 'font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              style={isActive && !featured ? { color: 'var(--li-primary)' } : undefined}
            >
              {featured ? (
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center -mt-5 shadow-lg"
                  style={{ background: 'var(--li-primary)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </span>
              ) : (
                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              )}
              <span className={featured ? 'font-semibold' : ''} style={featured ? { color: 'var(--li-primary)' } : undefined}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
