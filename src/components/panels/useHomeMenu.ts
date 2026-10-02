'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { animate, useMotionValue, type MotionValue } from 'framer-motion';
import { getSmoothScroll, scrollInstantly } from '@/lib/smooth-scroll';

// The menu and scrolling both compact the header. Keep their shared endpoint
// through Projects navigation until the scrolling title catches up.
export function useMenuHeaderHandoff({
  scrollProgress,
  nameProgress = scrollProgress,
  menuProgress,
  menuOpen,
  menuClosing,
  reducedMotion,
}: {
  scrollProgress: MotionValue<number>;
  nameProgress?: MotionValue<number>;
  menuProgress: MotionValue<number>;
  menuOpen: boolean;
  menuClosing: boolean;
  reducedMotion: boolean | null;
}) {
  const compactProgress = useMotionValue(0);
  const holding = useRef(false);
  const furthestScrollY = useRef(0);
  const releaseAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const keepCompact = useCallback(() => {
    releaseAnimation.current?.stop();
    releaseAnimation.current = null;
    furthestScrollY.current = window.scrollY;
    holding.current = true;
    compactProgress.set(1);
  }, [compactProgress]);

  useEffect(() => {
    const release = (returningToHero = false) => {
      if (!holding.current) return;
      holding.current = false;
      releaseAnimation.current?.stop();
      releaseAnimation.current = null;
      if (returningToHero && !reducedMotion) {
        releaseAnimation.current = animate(compactProgress, 0, {
          duration: 0.7,
          ease: [0.76, 0, 0.15, 1],
        });
      } else compactProgress.set(0);
    };
    const syncName = () => {
      if (nameProgress.get() >= 1) release();
    };
    const syncScroll = () => {
      if (!holding.current) return;
      const scrollY = window.scrollY;
      // Measured progress can regress when a precise animation frame is
      // followed by a rounded native scroll event. Release only on page movement.
      if (scrollY < furthestScrollY.current - 1) {
        release(true);
        return;
      }
      furthestScrollY.current = Math.max(furthestScrollY.current, scrollY);
      syncName();
    };
    const syncMenu = (value: number) => {
      if (menuOpen && value >= 1) release();
    };
    // Reopening can cancel navigation before its first scroll frame. A normal
    // close must still return the header even if the menu never fully opened.
    if (menuClosing) release(true);
    const unsubscribeScroll = scrollProgress.on('change', syncScroll);
    const unsubscribeName = nameProgress.on('change', syncName);
    const unsubscribeMenu = menuProgress.on('change', syncMenu);
    syncScroll();
    syncMenu(menuProgress.get());
    return () => {
      unsubscribeScroll();
      unsubscribeName();
      unsubscribeMenu();
    };
  }, [compactProgress, menuClosing, menuOpen, menuProgress, nameProgress, reducedMotion, scrollProgress]);

  useEffect(() => () => releaseAnimation.current?.stop(), []);
  return { compactProgress, keepCompact };
}

// Lock the page without changing its position or the hero's measured geometry.
// The navigation is part of the current page, so its trigger stays mounted.
export function useHomeMenu({ exitDuration = 450 }: { exitDuration?: number } = {}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const navigationId = useId();
  const release = useCallback(() => releaseRef.current?.(), []);
  const cancelClose = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
    setClosing(false);
  }, []);
  const closeImmediately = useCallback(() => {
    cancelClose();
    release();
    setOpen(false);
  }, [cancelClose, release]);
  const close = useCallback(() => {
    if (exitTimerRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      closeImmediately();
      return;
    }
    setClosing(true);
    exitTimerRef.current = setTimeout(closeImmediately, exitDuration);
  }, [closeImmediately, exitDuration]);
  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const styles = { htmlOverflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    const smoothScroll = getSmoothScroll();
    const wasStopped = smoothScroll?.isStopped;
    smoothScroll?.stop();
    html.style.scrollbarGutter = 'stable';
    html.style.overflow = 'hidden';
    // Body has height:100%. Hiding its overflow clips the page to one screen
    // on mobile and clamps scrollY to zero; lock the scrolling root alone.

    const onInput = (event: Event) => {
      const target = event.target;
      const scroller = target instanceof Element ? target.closest<HTMLElement>('[data-home-menu-scroll]') : null;
      // Always keep the hero's capture listeners out of menu gestures.
      event.stopImmediatePropagation();
      // Let a stationary contact generate its click on links and the close
      // button. Only the following movement needs native scroll prevention.
      if (event.type === 'touchstart') return;
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight) {
        if (event.cancelable) event.preventDefault();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) &&
            !(event.target instanceof Element && event.target.closest('button, a[href]'))) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      const controls = Array.from(new Set([
        ...document.querySelectorAll<HTMLElement>('[data-site-navigation] button, [data-site-navigation] a[href]'),
        ...(rootRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? []),
      ]))
        .filter((element) => element.tabIndex >= 0 && !element.closest('[inert], [aria-hidden="true"]') &&
          getComputedStyle(element).visibility !== 'hidden' && element.getBoundingClientRect().height > 0);
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index === -1 || index === controls.length - 1))) {
        event.preventDefault();
        (event.shiftKey ? controls.at(-1) : controls[0])?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('wheel', onInput, { capture: true, passive: false });
    window.addEventListener('touchstart', onInput, { capture: true, passive: false });
    window.addEventListener('touchmove', onInput, { capture: true, passive: false });
    window.addEventListener('keydown', onKey, { capture: true });
    triggerRef.current?.focus({ preventScroll: true });

    let released = false;
    const unlock = () => {
      if (released) return;
      released = true;
      html.style.overflow = styles.htmlOverflow;
      html.style.scrollbarGutter = styles.gutter;
      if (window.scrollY !== scrollY) scrollInstantly(scrollY);
      if (!wasStopped && getSmoothScroll() === smoothScroll) smoothScroll?.start();
      window.removeEventListener('wheel', onInput, { capture: true });
      window.removeEventListener('touchstart', onInput, { capture: true });
      window.removeEventListener('touchmove', onInput, { capture: true });
      window.removeEventListener('keydown', onKey, { capture: true });
      triggerRef.current?.focus({ preventScroll: true });
    };
    releaseRef.current = unlock;
    return () => {
      unlock();
      releaseRef.current = null;
    };
  }, [open, close]);

  return { open, closing, setOpen, rootRef, triggerRef, navigationId, close, closeImmediately, cancelClose, release };
}
