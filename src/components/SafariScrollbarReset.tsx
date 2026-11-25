'use client';

import { useEffect } from 'react';

// Desktop Safari keeps its overlay scrollbar on screen after a Lenis smooth
// scroll: Lenis takes over the wheel gesture, so Safari never sees the gesture
// end and never fades the scrollbar out (with Reduce motion on, Lenis is off
// and the scrollbar hides as usual). Once scrolling has been still for a
// moment, switching the root to overflow: hidden for one frame makes Safari
// rebuild its scrollbar, and a fresh overlay scrollbar starts out hidden.
//
// Lenis itself is untouched (its autoToggle option, the only thing that reacts
// to overflow changes, is off). The reset only runs in desktop Safari, only
// while Lenis is active, and only with overlay scrollbars, which take no width,
// so nothing on the page moves.
const IDLE_MS = 900;

function isDesktopSafari() {
  const ua = navigator.userAgent;
  return /Macintosh/.test(ua) && /Safari\//.test(ua) && /Version\//.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(ua) && navigator.maxTouchPoints === 0;
}

export default function SafariScrollbarReset() {
  useEffect(() => {
    if (!isDesktopSafari()) return;
    const root = document.documentElement;
    let timer = 0;
    let frame = 0;

    const reset = () => {
      if (!root.classList.contains('lenis')) return; // native scrolling hides on its own
      if (window.innerWidth !== root.clientWidth) return; // classic scrollbars: leave them be
      const previous = root.style.overflow;
      root.style.overflow = 'hidden';
      void root.offsetWidth; // apply it before the next frame
      frame = requestAnimationFrame(() => {
        root.style.overflow = previous;
      });
    };

    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, IDLE_MS);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
