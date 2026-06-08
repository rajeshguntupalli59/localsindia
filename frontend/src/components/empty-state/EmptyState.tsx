import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/30 mb-4" strokeWidth={1.5} />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
          style={{ background: 'var(--li-primary)' }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
