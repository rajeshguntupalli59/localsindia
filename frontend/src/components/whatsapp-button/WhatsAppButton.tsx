import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  variant?: 'full' | 'compact';
  label?: string;
  className?: string;
}

export default function WhatsAppButton({
  url,
  variant = 'compact',
  label = 'WhatsApp',
  className,
}: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 active:scale-95',
        variant === 'full' ? 'w-full py-3 text-base' : 'w-full py-2 text-sm',
        className,
      )}
      style={{ background: 'var(--li-wa-green)' }}
    >
      <MessageCircle className={variant === 'full' ? 'w-5 h-5' : 'w-4 h-4'} />
      {label}
    </a>
  );
}
