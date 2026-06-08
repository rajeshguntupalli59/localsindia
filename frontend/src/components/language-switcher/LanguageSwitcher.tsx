'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
];

export default function LanguageSwitcher() {
  const router = useRouter();

  const setLocale = (code: string) => {
    document.cookie = `lang=${code}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-white/80 hover:text-white hover:bg-white/10 h-8 px-2 rounded-md transition-colors">
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium">Lang</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem key={lang.code} onClick={() => setLocale(lang.code)}>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
