'use client';

import { useEffect, useRef } from 'react';

interface AutoplayVideoProps {
  src: string;
  poster?: string;
  autoplay: boolean;
  className?: string;
}

// Autoplaying videos play muted and loop like a GIF. React doesn't render the
// `muted` attribute on the server, which blocks autoplay in some browsers, so
// it's set on the element directly before playing.
export default function AutoplayVideo({ src, poster, autoplay, className }: AutoplayVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoplay) return;
    video.muted = true;
    video.play().catch(() => {
      // Autoplay refused (e.g. low-power mode): the poster stays visible
    });
  }, [autoplay, src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      playsInline
      preload="metadata"
      {...(autoplay ? { autoPlay: true, muted: true, loop: true } : { controls: true })}
    />
  );
}
