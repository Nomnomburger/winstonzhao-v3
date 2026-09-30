'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { getSmoothScroll, scrollInstantly, setSmoothScroll } from '@/lib/smooth-scroll';

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let instance: Lenis | null = null;

    const destroy = () => {
      if (!instance) return;
      if (getSmoothScroll() === instance) setSmoothScroll(null);
      instance.destroy();
      instance = null;
    };

    const update = () => {
      if (!desktop.matches || reducedMotion.matches) {
        destroy();
        return;
      }
      if (instance) return;

      instance = new Lenis({
        autoRaf: true,
        // Keep the response close to the wheel while softening each step.
        lerp: 0.18,
        smoothWheel: true,
        syncTouch: false,
        overscroll: false,
        stopInertiaOnNavigate: true,
        virtualScroll: ({ event, deltaX, deltaY }) => {
          // The hero's capture listener gets first refusal on snap gestures.
          if (event.defaultPrevented) return false;
          if (event instanceof WheelEvent) {
            if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
                Math.abs(deltaY) <= Math.abs(deltaX)) return false;
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable ||
                target.closest('input, textarea, select, [role="textbox"]'))) return false;
          }
          return true;
        },
      });
      setSmoothScroll(instance);
    };

    const onKey = (event: KeyboardEvent) => {
      if (!instance || instance.isScrolling !== 'smooth' || event.defaultPrevented ||
          event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable ||
          target.closest('input, textarea, select, [role="textbox"]'))) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) {
        // Let native keyboard scrolling take over without an old wheel target
        // pulling the page back on the next animation frame.
        scrollInstantly(window.scrollY);
      }
    };

    update();
    desktop.addEventListener('change', update);
    reducedMotion.addEventListener('change', update);
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      desktop.removeEventListener('change', update);
      reducedMotion.removeEventListener('change', update);
      window.removeEventListener('keydown', onKey, { capture: true });
      destroy();
    };
  }, []);

  useEffect(() => {
    const instance = getSmoothScroll();
    if (!instance) return;
    // Leave Next's navigation and Back restoration in charge of the position.
    scrollInstantly(window.scrollY);
    const frame = requestAnimationFrame(() => {
      if (getSmoothScroll() === instance) instance.resize();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
