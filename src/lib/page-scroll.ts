import { motionValue } from 'framer-motion';

// The document's scroll offset as a motion value. scrollInstantly writes it in
// the same task as the scroll itself, so an element positioned from it never
// trails the page while the hero drives scrolling; native scroll events keep
// it current everywhere else.
export const pageScrollY = motionValue(0);
let tracking = false;

export function syncPageScroll() {
  if (typeof window === 'undefined') return;
  pageScrollY.set(window.scrollY);
}

export function trackPageScroll() {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  syncPageScroll();
  window.addEventListener('scroll', syncPageScroll, { passive: true });
}
