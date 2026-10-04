import type Lenis from 'lenis';
import { syncPageScroll } from './page-scroll';

let smoothScroll: Lenis | null = null;

export function getSmoothScroll() {
  return smoothScroll;
}

export function setSmoothScroll(instance: Lenis | null) {
  smoothScroll = instance;
}

// Hero animations own their scroll position. Cancel a pending smooth wheel
// target before writing so the two animations never compete for the page.
export function scrollInstantly(top: number) {
  const instance = smoothScroll;
  if (!instance) {
    window.scrollTo({ top, behavior: 'instant' });
    syncPageScroll();
    return;
  }
  if (instance.isScrolling === 'smooth') {
    const wasStopped = instance.isStopped;
    instance.stop();
    if (!wasStopped) instance.start();
  }
  instance.scrollTo(top, { immediate: true, force: true });
  syncPageScroll();
}
