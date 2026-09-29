import { urlFor } from '../../sanity/lib/image';

// Sanity's crop and hotspot, as fractions of the original image
export interface ImageCrop {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface ImageHotspot {
  x?: number;
  y?: number;
}

// The subset of an image field needed to build a URL. Safe to import from
// client components (it only builds strings).
export interface ImageSource {
  asset?: {
    _id: string;
    url: string;
    metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
  };
  crop?: ImageCrop;
  hotspot?: ImageHotspot;
  alt?: string;
}

const isSanityUrl = (url: string) => url.startsWith('https://cdn.sanity.io/');

// Sanity images are resized on Sanity's CDN (respecting crop and hotspot).
// Anything else (the mock placeholder photos) is used as is.
export function imageUrl(image: ImageSource | undefined, width: number, height?: number) {
  const url = image?.asset?.url;
  if (!url) return undefined;
  if (!isSanityUrl(url)) return url;
  let builder = urlFor(image as Parameters<typeof urlFor>[0])
    .width(width)
    .auto('format')
    .quality(80);
  if (height) builder = builder.height(height).fit('crop');
  return builder.url();
}

// The crop the CDN applies, or none for images it doesn't serve
function appliedCrop(image: ImageSource | undefined) {
  const c = image?.asset?.url && isSanityUrl(image.asset.url) ? image.crop : undefined;
  return { top: c?.top ?? 0, bottom: c?.bottom ?? 0, left: c?.left ?? 0, right: c?.right ?? 0 };
}

// Width / height of the image as served (after the studio crop), for
// aspect-ratio boxes.
export function imageAspect(image: ImageSource | undefined, fallback = 4 / 3) {
  const d = image?.asset?.metadata?.dimensions;
  if (!d) return fallback;
  const c = appliedCrop(image);
  const width = d.width * (1 - c.left - c.right);
  const height = d.height * (1 - c.top - c.bottom);
  return width > 0 && height > 0 ? width / height : d.width / d.height;
}

// CSS object-position that keeps the studio hotspot in view when an image is
// cropped further by object-cover (e.g. the fixed-shape home page cards).
export function imageObjectPosition(image: ImageSource | undefined) {
  const h = image?.hotspot;
  if (h?.x === undefined || h?.y === undefined) return undefined;
  const c = appliedCrop(image);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp((h.x - c.left) / (1 - c.left - c.right || 1));
  const y = clamp((h.y - c.top) / (1 - c.top - c.bottom || 1));
  return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;
}
