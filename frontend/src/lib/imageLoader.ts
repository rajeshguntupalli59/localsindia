// next/image loader. The site runs on Azure Static Web Apps, which can't run
// Next's image optimiser, so Cloudinary does the resizing: it serves each
// photo at the displayed width, in WebP/AVIF where the browser supports it.
// Everything else (our own /public images) is returned unchanged.
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    return src.replace('/upload/', `/upload/f_auto,q_${quality ?? 'auto'},c_limit,w_${width}/`);
  }
  return src;
}
