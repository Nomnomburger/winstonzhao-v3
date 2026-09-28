'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

interface AutoplayVideoProps {
  src: string;
  poster?: string;
  // Width / height to reserve before the video loads (the poster's, if any)
  aspect?: number;
  autoplay: boolean;
}

// Autoplaying videos play muted and loop like a GIF, with a small pause
// button. They fall back to normal video controls when autoplay is refused
// (e.g. low-power mode) or the visitor prefers reduced motion. React doesn't
// render the `muted` attribute on the server, which blocks autoplay in some
// browsers, so playback starts here once `muted` is set on the element.
export default function AutoplayVideo({ src, poster, aspect, autoplay }: AutoplayVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ratio, setRatio] = useState(aspect ?? 16 / 9);
  const reducedMotion = usePrefersReducedMotion();
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const manual = !autoplay || reducedMotion || blocked;

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoplay) return;
    // (Also read directly: on the first render after hydration the store
    // still reports the server's value.)
    if (reducedMotion || window.matchMedia(REDUCED_MOTION).matches) {
      video.pause();
      return;
    }
    video.muted = true;
    video.play().catch(() => setBlocked(true));
  }, [autoplay, src, reducedMotion]);

  const togglePlay = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setBlocked(true));
    else video.pause();
  };

  return (
    <div className="relative w-full overflow-hidden bg-foreground/5" style={{ aspectRatio: ratio }}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const { videoWidth, videoHeight } = e.currentTarget;
          if (videoWidth && videoHeight) setRatio(videoWidth / videoHeight);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        controls={manual}
        {...(autoplay ? { muted: true, loop: true } : {})}
      />
      {!manual && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause video' : 'Play video'}
          className="absolute right-3 bottom-3 flex items-center justify-center w-7 h-7 bg-background/80 text-foreground cursor-pointer"
        >
          {playing ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
              <rect x="0" y="0" width="3" height="12" />
              <rect x="7" y="0" width="3" height="12" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
              <path d="M0 0L10 6L0 12Z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
