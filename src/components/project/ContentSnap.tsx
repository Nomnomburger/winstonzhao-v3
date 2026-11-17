'use client';

import { useEffect } from 'react';
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';
import { getSmoothScroll, scrollInstantly } from '@/lib/smooth-scroll';
import { documentTop } from '@/components/panels/useHeroScroll';
import {
  DOCK_TOLERANCE, SNAP_DURATION, SNAP_EASE, UPWARD_INTENT_MS, WHEEL_GESTURE_IDLE_MS,
  isEditable, isKeyboardControl, trackWheelGesture, wheelDistance,
  type SnapDirection, type WheelGesture,
} from '@/lib/scroll-snap';

// Desktop only: the project page snaps between its overview (title, hero,
// summary) and the case study below it, with the home page's snap. Scrolling
// down to where the case study comes into view carries it up to the top of
// the screen; scrolling back up from there returns to the end of the overview.
// The rest of the page scrolls freely.
//
// Momentum never snaps, in either direction. A fling that fades out after the
// fingers lift coasts to a stop at the snap point instead: at the end of the
// overview on the way down, at the top of the case study on the way up (as
// the home page does on the way up to its hero). A fresh push then snaps.
//
// `contentId` is the case study's wrapper. Its first section is the
// destination, lined up by its scroll margin where the side menu sticks.
// `overviewId` is everything above it. It fades out while the page snaps
// down and stays hidden at the case study, so it doesn't show through the
// header's blur; it fades back in as the page returns.
export default function ContentSnap({ contentId, overviewId }: { contentId: string; overviewId?: string }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // An instant jump of a whole screen is no kinder than the animation.
    if (reducedMotion) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const overview = overviewId ? document.getElementById(overviewId) : null;

    // overviewEnd: the case study's top edge at the bottom of the screen.
    // contentTop: its first section at the top, under the header.
    let overviewEnd = 0;
    let contentTop = 0;
    // False when the case study is too short to reach the top of the screen.
    let canDock = false;
    let animation: AnimationPlaybackControls | null = null;
    let snapDirection: SnapDirection | null = null;
    let snapped = false;
    let upwardIntentUntil = 0;
    let upwardMomentum = false;
    let downwardMomentumUntil = 0;
    let gesture: WheelGesture | null = null;
    let lastScrollY = window.scrollY;
    let frame = 0;

    const measure = () => {
      const content = document.getElementById(contentId);
      const first = content?.querySelector('section');
      if (!content || !first) {
        overviewEnd = contentTop = 0;
        return;
      }
      const margin = parseFloat(getComputedStyle(first).scrollMarginTop) || 0;
      const dock = Math.max(0, documentTop(first) - margin);
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // A short case study can't scroll all the way up; snap to the bottom.
      canDock = dock <= maxScroll + 2;
      contentTop = Math.min(dock, maxScroll);
      overviewEnd = Math.min(contentTop, Math.max(0, documentTop(content) - window.innerHeight));
    };

    const enabled = () => desktop.matches && contentTop > overviewEnd + 1;
    // The menu and the lightbox lock the page's scrolling root.
    const active = () => enabled() && document.documentElement.style.overflow !== 'hidden';

    // Hidden from the start of a snap down, and whenever the page sits at or
    // below the top of the case study; shown from the start of a snap up.
    const updateFade = () => {
      if (!overview) return;
      const faded = enabled() && canDock && (snapDirection === 1 ||
        (snapDirection === null && window.scrollY >= contentTop - 2));
      overview.toggleAttribute('data-faded', faded);
    };

    const cancelSnap = () => {
      animation?.stop();
      animation = null;
      snapDirection = null;
      upwardIntentUntil = 0;
      upwardMomentum = false;
      downwardMomentumUntil = 0;
      scrollInstantly(window.scrollY);
      updateFade();
    };

    // Upward momentum stops at the top of the case study instead of carrying
    // on into the overview. A fresh push past it returns to the overview.
    const stopAtContent = (smooth = false) => {
      snapped = true;
      if (gesture?.direction === -1) gesture.consumed = true;
      const smoothScroll = smooth ? getSmoothScroll() : null;
      if (smoothScroll) {
        smoothScroll.scrollTo(contentTop, { programmatic: false, lerp: smoothScroll.options.lerp });
        return;
      }
      scrollInstantly(contentTop);
    };

    // Downward momentum eases to a stop at the end of the overview, where the
    // case study starts to come into view. A fresh push then snaps to it.
    const stopAtOverviewEnd = (smooth = false) => {
      if (gesture?.direction === 1) gesture.consumed = true;
      const smoothScroll = smooth ? getSmoothScroll() : null;
      if (smoothScroll) {
        smoothScroll.scrollTo(overviewEnd, { programmatic: false, lerp: smoothScroll.options.lerp });
        return;
      }
      if (smooth) window.scrollTo({ top: overviewEnd, behavior: 'smooth' });
      else scrollInstantly(overviewEnd);
    };

    const snapTo = (direction: SnapDirection) => {
      measure();
      if (contentTop <= overviewEnd + 1) return;
      const target = direction === 1 ? contentTop : overviewEnd;
      cancelSnap();
      snapped = direction === 1;
      // Consume the rest of the gesture that started this snap.
      if (gesture?.direction === direction &&
          performance.now() - gesture.lastEventAt < WHEEL_GESTURE_IDLE_MS) {
        gesture.consumed = true;
      }
      const finish = () => {
        animation = null;
        snapDirection = null;
        scrollInstantly(target);
        updateFade();
      };
      if (Math.abs(window.scrollY - target) < 1) {
        finish();
        return;
      }
      snapDirection = direction;
      updateFade();
      animation = animate(window.scrollY, target, {
        duration: SNAP_DURATION[direction],
        ease: SNAP_EASE,
        onUpdate: scrollInstantly,
        onComplete: finish,
      });
    };

    // A click starts any scroll that follows (the section menu, a link), so
    // it ends the wheel's intent: an upward scroll to a section must not be
    // taken for a push back to the overview.
    const clearIntent = () => {
      upwardIntentUntil = 0;
      upwardMomentum = false;
      downwardMomentumUntil = 0;
    };

    // `distance` is how far the input would scroll the page on its own.
    // `paging` is a whole-screen step (Page Down, Space).
    const handleDirection = (direction: SnapDirection, event: Event, distance: number, momentum = false, paging = false) => {
      if (snapDirection !== null) {
        if (event.cancelable) event.preventDefault();
        if (direction !== snapDirection) snapTo(direction);
        return;
      }
      const y = window.scrollY;
      if (direction === -1) {
        downwardMomentumUntil = 0;
        upwardIntentUntil = performance.now() + UPWARD_INTENT_MS;
        upwardMomentum = momentum;
        if (!momentum && y > overviewEnd + 1 && y <= contentTop + DOCK_TOLERANCE) {
          if (event.cancelable) event.preventDefault();
          snapTo(-1);
        }
      } else {
        upwardIntentUntil = 0;
        upwardMomentum = false;
        if (!momentum) downwardMomentumUntil = 0;
        // Lenis may already be heading further than the visible position.
        const smoothScroll = getSmoothScroll();
        const from = smoothScroll?.isScrolling === 'smooth' ? smoothScroll.targetScroll : y;
        if (!snapped && y < contentTop - 1 && from + distance > overviewEnd + 1) {
          if (event.cancelable) event.preventDefault();
          // Still pushing: snap. Only coasting: stop at the snap point. A page
          // step that would skip the end of the overview stops there first.
          if (paging && y < overviewEnd - 1) stopAtOverviewEnd(true);
          else if (momentum && y <= overviewEnd + 1) stopAtOverviewEnd(!!smoothScroll);
          else snapTo(1);
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (!active() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          event.shiftKey || isEditable(event.target) ||
          (event.target instanceof Element && event.target.closest('[data-lenis-prevent]')) ||
          Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const direction = event.deltaY < 0 ? -1 : 1;
      const smoothScroll = getSmoothScroll();
      const delta = wheelDistance(event);
      gesture = trackWheelGesture(gesture, direction, delta, performance.now(), snapDirection !== null);
      // Guards the snap point from a fling's uncancelable tail, only while
      // that tail is still arriving, so a later jump down is left alone.
      downwardMomentumUntil = direction === 1 && gesture.momentum
        ? performance.now() + WHEEL_GESTURE_IDLE_MS : 0;

      // Trackpad momentum can outlast the snap. Keep consuming the fading
      // tail; a renewed push, pause or reversal starts a fresh gesture.
      if (gesture.consumed && snapDirection === null) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      handleDirection(direction, event, delta * (smoothScroll?.options.wheelMultiplier ?? 1), gesture.momentum);
      if (direction === -1 && gesture.momentum && snapDirection === null &&
          window.scrollY >= contentTop &&
          (smoothScroll ? smoothScroll.targetScroll - delta * smoothScroll.options.wheelMultiplier :
            window.scrollY - delta) <= contentTop) {
        if (event.cancelable) event.preventDefault();
        stopAtContent(!!smoothScroll);
      }
      if (snapDirection !== null || event.defaultPrevented) gesture.consumed = true;
    };

    const onKey = (event: KeyboardEvent) => {
      if (!active() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          isKeyboardControl(event.target)) return;
      if (event.key === 'Home' || event.key === 'End' || event.key === 'Escape') {
        upwardIntentUntil = 0;
        downwardMomentumUntil = 0;
        if (snapDirection !== null) cancelSnap();
        return;
      }
      const page = window.innerHeight * 0.875;
      const upward = event.key === 'ArrowUp' || event.key === 'PageUp' ||
        (event.key === ' ' && event.shiftKey);
      if (upward && (!event.shiftKey || event.key === ' ')) {
        handleDirection(-1, event, event.key === 'ArrowUp' ? 40 : page);
        return;
      }
      if (event.shiftKey) return;
      if (event.key === 'ArrowDown') handleDirection(1, event, 40);
      else if (event.key === 'PageDown' || event.key === ' ') handleDirection(1, event, page, false, true);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const previousY = lastScrollY;
      const movingUp = y < previousY;
      lastScrollY = y;
      updateFade();
      // Back at the overview starts a new visit.
      if (y <= overviewEnd + 1 && snapDirection === null) snapped = false;
      if (!active() || snapDirection !== null) return;
      if (!movingUp) {
        // Catch a fading fling the wheel handler could not cancel.
        if (y > previousY && performance.now() < downwardMomentumUntil && !snapped &&
            previousY <= overviewEnd + 1 && y > overviewEnd + 1) {
          stopAtOverviewEnd();
          lastScrollY = overviewEnd;
        }
        return;
      }
      const hasUpwardIntent = performance.now() < upwardIntentUntil;
      if (!hasUpwardIntent) return;
      if (upwardMomentum) {
        // Uncancelable wheel momentum can keep scrolling after input ends.
        // Keep its guard alive without permission to return to the overview.
        upwardIntentUntil = performance.now() + UPWARD_INTENT_MS;
        if (previousY >= contentTop && y <= contentTop) {
          // A rounded final Lenis frame can reach the edge before its easing
          // completes. Leave that last frame to the scroll engine.
          if (getSmoothScroll()?.targetScroll === contentTop && y >= contentTop - 1) return;
          // Catch an overshoot the wheel handler could not cancel.
          stopAtContent();
          lastScrollY = contentTop;
        }
        return;
      }
      // Deliberate input may still cross the dock in a single native frame.
      if (y > overviewEnd + 1 && y <= contentTop + DOCK_TOLERANCE) snapTo(-1);
    };

    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        if (snapDirection !== null) cancelSnap();
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureAndFade);
    };
    const onDesktopChange = () => {
      if (!desktop.matches && snapDirection !== null) cancelSnap();
      updateFade();
    };

    // Media, fonts and the reveals settle after load; keep the edges current.
    const measureAndFade = () => {
      measure();
      updateFade();
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureAndFade);
    });
    // body keeps the window's height when Lenis is off; main holds the page.
    observer.observe(document.getElementById(contentId)?.closest('main') ?? document.body);
    measureAndFade();
    let disposed = false;
    document.fonts.ready.then(() => {
      if (!disposed) measureAndFade();
    });

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', clearIntent, true);
    window.addEventListener('click', clearIntent, true);
    desktop.addEventListener('change', onDesktopChange);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      animation?.stop();
      overview?.removeAttribute('data-faded');
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', clearIntent, true);
      window.removeEventListener('click', clearIntent, true);
      desktop.removeEventListener('change', onDesktopChange);
    };
  }, [contentId, overviewId, reducedMotion]);

  return null;
}
