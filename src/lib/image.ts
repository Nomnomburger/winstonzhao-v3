import { urlFor } from '../../sanity/lib/image';

// The subset of an image field needed to build a URL. Safe to import from
// client components (it only builds strings).
export interface ImageSource {
  asset?: {
    _id: string;
    url: string;
    metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
  };
  crop?: unknown;
  hotspot?: unknown;
  alt?: string;
}

// Sanity images are resized on Sanity's CDN (respecting crop and hotspot).
// Anything else (the mock placeholder photos) is used as is.
export function imageUrl(image: ImageSource | undefined, width: number, height?: number) {
  const url = image?.asset?.url;
  if (!url) return undefined;
  if (!url.startsWith('https://cdn.sanity.io/')) return url;
  let builder = urlFor(image as Parameters<typeof urlFor>[0])
    .width(width)
    .auto('format')
    .quality(80);
  if (height) builder = builder.height(height).fit('crop');
  return builder.url();
}

// Width / height of the original upload, for aspect-ratio boxes.
export function imageAspect(image: ImageSource | undefined, fallback = 4 / 3) {
  const d = image?.asset?.metadata?.dimensions;
  return d ? d.width / d.height : fallback;
}
