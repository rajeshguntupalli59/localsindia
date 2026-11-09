import { MessageCircle } from 'lucide-react';

interface ShareListProps {
  title: string;
  names: string[];
  total: number;
  url: string;
}

export function shareListText({ title, names, total, url }: ShareListProps): string {
  const top = names.slice(0, 3);
  return [
    title,
    '',
    ...top.map((name, i) => `${i + 1}. ${name}`),
    '',
    total > top.length ? `See all ${total.toLocaleString('en-IN')} on LocalsIndia:` : 'See them on LocalsIndia:',
    url,
  ].join('\n');
}

// A plain link, so it works on the server-rendered page without any JavaScript.
export default function ShareListButton(props: ShareListProps) {
  if (props.names.length === 0) return null;
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(shareListText(props))}`}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
      style={{ background: '#25D366' }}
    >
      <MessageCircle size={16} /> Share this list
    </a>
  );
}
