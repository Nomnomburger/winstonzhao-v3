'use client';

// A client module on purpose: images rendered by a server component are sent
// as preload hints in the page's RSC payload, so prefetching a project link on
// the home page would start downloading its full-size hero.
import { imageUrl, imageAspect, type ImageSource } from '@/lib/image';
import AutoplayVideo from './AutoplayVideo';

const SRCSET_WIDTHS = [640, 1000, 1400, 2000, 2800];

interface ResponsiveImageProps {
  image: ImageSource;
  sizes: string;
  className?: string;
  priority?: boolean;
  // Force a crop to this aspect ratio (width / height); defaults to the
  // image's own proportions.
  aspect?: number;
}

export function ResponsiveImage({ image, sizes, className = '', priority = false, aspect }: ResponsiveImageProps) {
  const ratio = aspect ?? imageAspect(image);
  const src = imageUrl(image, 1400, aspect ? Math.round(1400 / aspect) : undefined);
  if (!src) return null;
  const srcSet = SRCSET_WIDTHS.map(
    (w) => `${imageUrl(image, w, aspect ? Math.round(w / aspect) : undefined)} ${w}w`,
  ).join(', ');
  const lqip = image.asset?.metadata?.lqip;

  return (
    <div
      className={`relative w-full overflow-hidden bg-foreground/5 ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundImage: lqip ? `url(${lqip})` : undefined,
        backgroundSize: 'cover',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={image.alt ?? ''}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

function Caption({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <figcaption className="mt-3 text-[12px] md:text-[14px] tracking-[-0.02em] leading-[1.2]">
      {children}
    </figcaption>
  );
}

export function ImageFigure({
  image,
  caption,
  sizes,
  priority,
}: {
  image: ImageSource;
  caption?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <figure className="w-full">
      <ResponsiveImage image={image} sizes={sizes} priority={priority} />
      <Caption>{caption}</Caption>
    </figure>
  );
}

export interface VideoData {
  fileUrl?: string;
  url?: string;
  poster?: ImageSource;
  autoplay?: boolean;
  caption?: string;
}

export function VideoFigure({ video }: { video: VideoData }) {
  const src = video.fileUrl || video.url;
  if (!src) return null;
  return (
    <figure className="w-full">
      <AutoplayVideo
        src={src}
        poster={imageUrl(video.poster, 2000)}
        aspect={video.poster?.asset ? imageAspect(video.poster) : undefined}
        autoplay={video.autoplay !== false}
      />
      <Caption>{video.caption}</Caption>
    </figure>
  );
}

const GALLERY_COLUMNS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
};

export function GalleryFigure({ images, caption }: { images: ImageSource[]; caption?: string }) {
  const shown = images.filter((img) => img.asset?.url);
  if (shown.length === 0) return null;
  // Every image in the row shares the first image's proportions so the row
  // lines up.
  const aspect = imageAspect(shown[0]);
  return (
    <figure className="w-full">
      <div className={`grid gap-4 ${GALLERY_COLUMNS[shown.length] ?? 'grid-cols-2'}`}>
        {shown.map((image, i) => (
          <ResponsiveImage
            key={i}
            image={image}
            aspect={aspect}
            sizes={`(min-width: 768px) ${Math.round(100 / shown.length)}vw, 100vw`}
          />
        ))}
      </div>
      <Caption>{caption}</Caption>
    </figure>
  );
}
