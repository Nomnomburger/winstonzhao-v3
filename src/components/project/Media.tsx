'use client';

// A client module on purpose: images rendered by a server component are sent
// as preload hints in the page's RSC payload, so prefetching a project link on
// the home page would start downloading its full-size hero.
import { Fragment } from 'react';
import { imageUrl, imageAspect, type ImageSource } from '@/lib/image';
import AutoplayVideo from './AutoplayVideo';
import Lightbox from './Lightbox';

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

  // No placeholder fill: the box sits on the page background from the start,
  // so images with transparency (device mockups, close-ups) never flash grey.
  // The aspect ratio still reserves the space while the image loads. A span
  // (display: block) so it can sit inside the lightbox button.
  return (
    <span className={`relative block w-full overflow-hidden ${className}`} style={{ aspectRatio: ratio }}>
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
    </span>
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
      <Lightbox image={image}>
        <ResponsiveImage image={image} sizes={sizes} priority={priority} />
      </Lightbox>
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

// A small arrow between images in a sequence. The same grey and size as
// the arrows drawn into the composite images, so they match: it reads on
// the white and the near-black page.
function SequenceArrow({ vertical = false }: { vertical?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 12"
      fill="none"
      className={`h-3 w-6 shrink-0 ${vertical ? 'rotate-90 sm:rotate-0' : ''}`}
    >
      <path
        d="M2 6H22M16.5 0.5L22 6L16.5 11.5"
        stroke="#949494"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GalleryFigure({
  images,
  caption,
  arrows = false,
}: {
  images: ImageSource[];
  caption?: string;
  arrows?: boolean;
}) {
  const shown = images.filter((img) => img.asset?.url);
  if (shown.length === 0) return null;
  // Every image in the row shares the first image's proportions so the row
  // lines up.
  const aspect = imageAspect(shown[0]);
  const sizes = `(min-width: 768px) ${Math.round(100 / shown.length)}vw, 100vw`;
  if (arrows && shown.length > 1) {
    // Three images stack on phones like the plain gallery, with the arrows
    // turned to point down.
    const stack = shown.length > 2;
    return (
      <figure className="w-full">
        <div className={`flex items-center gap-2 md:gap-3 ${stack ? 'flex-col sm:flex-row' : 'flex-row'}`}>
          {shown.map((image, i) => (
            <Fragment key={i}>
              {i > 0 && <SequenceArrow vertical={stack} />}
              <div className={`min-w-0 ${stack ? 'w-full sm:w-auto sm:flex-1' : 'flex-1'}`}>
                <Lightbox image={image}>
                  <ResponsiveImage image={image} aspect={aspect} sizes={sizes} />
                </Lightbox>
              </div>
            </Fragment>
          ))}
        </div>
        <Caption>{caption}</Caption>
      </figure>
    );
  }
  return (
    <figure className="w-full">
      <div className={`grid gap-4 ${GALLERY_COLUMNS[shown.length] ?? 'grid-cols-2'}`}>
        {shown.map((image, i) => (
          <Lightbox key={i} image={image}>
            <ResponsiveImage image={image} aspect={aspect} sizes={sizes} />
          </Lightbox>
        ))}
      </div>
      <Caption>{caption}</Caption>
    </figure>
  );
}
