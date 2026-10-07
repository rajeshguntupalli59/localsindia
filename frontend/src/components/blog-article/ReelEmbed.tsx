import { PlayCircle } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';

// Embeds one of our Instagram reels via Instagram's /embed page (no
// third-party script). Fixed height so the article doesn't shift on load.
export default function ReelEmbed({ video }: { video: NonNullable<BlogPost['video']> }) {
  return (
    <figure className="mb-10">
      <div
        className="mx-auto rounded-2xl border overflow-hidden bg-white"
        style={{ borderColor: 'var(--li-border)', maxWidth: 400 }}
      >
        <iframe
          src={`https://www.instagram.com/reel/${video.shortcode}/embed/`}
          title={video.title}
          loading="lazy"
          allowFullScreen
          scrolling="no"
          className="block w-full"
          style={{ height: 640, border: 0 }}
        />
      </div>
      <figcaption className="mt-2 text-center text-xs" style={{ color: 'var(--li-muted)' }}>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-orange-500 transition-colors"
        >
          <PlayCircle className="w-3.5 h-3.5" /> Watch on Instagram · @localsindia1
        </a>
      </figcaption>
    </figure>
  );
}
