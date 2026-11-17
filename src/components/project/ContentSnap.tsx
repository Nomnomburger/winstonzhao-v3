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

const ELASTIC_THRESHOLD = 120; // wheel input past the snap point that snaps over
const ELASTIC_RANGE = 140; // the stretch approaches this, never reaching it
const ELASTIC_IDLE_MS = 200; // no input for this long counts as letting go
const ELASTIC_MEMORY_MS = 1200; // a push within this carries on from the last

// The stretch for an amount of pull, and back. The same curve as iOS's
// rubber band: it gives easily at first and stiffens as it goes.
const stretch = (pull: number) => ELASTIC_RANGE * (1 - 1 / ((pull * 0.55) / ELASTIC_RANGE + 1));
const unstretch = (offset: number) => {
  const fraction = Math.min(offset / ELASTIC_RANGE, 0.99);
  return (ELASTIC_RANGE / 0.55) * (1 / (1 - fraction) - 1);
};

interface Elastic {
  direction: SnapDirection;
  edge: number;
  pull: number;
  peak: number;
  y: number;
  lastInput: number;
  frame: number;
}

// Desktop only: the project page snaps between its overview (title, hero,
// summary) and the case study below it, with the home page's snap. Scrolling
// down to where the case study comes into view carries it up to the top of
// the screen; scrolling back up from there returns to the end of the overview.
// The rest of the page scrolls freely.
//
// A push at the snap point first stretches the page a little past it,
// against growing resistance, like a rubber band. Pushing on past
// ELASTIC_THRESHOLD of wheel input snaps over; letting go springs back. A
// second push soon after carries on from the first, so slow wheel notches
// get there too.
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
    let elastic: Elastic | null = null;
    let lastStretch = { direction: 1 as SnapDirection, pull: 0, at: 0 };
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
        (snapDirection === null && (window.scrollY >= contentTop - 2 || elastic?.direction === -1)));
      overview.toggleAttribute('data-faded', faded);
    };

    const stopElastic = () => {
      if (!elastic) return;
      cancelAnimationFrame(elastic.frame);
      elastic = null;
    };

    // Letting go springs back, but remembers how far the push got: another
    // push soon after, even mid-spring, carries on from there.
    const releaseElastic = (e: Elastic) => {
      if (e.pull > 0) lastStretch = { direction: e.direction, pull: e.peak, at: performance.now() };
      e.pull = 0;
    };
    const recall = (direction: SnapDirection, now: number) =>
      lastStretch.direction === direction && now - lastStretch.at < ELASTIC_MEMORY_MS ? lastStretch.pull : 0;

    const cancelSnap = () => {
      stopElastic();
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

    // Each frame, the page eases toward the stretch for the current pull.
    // Without fresh input the pull drops to nothing and it springs back.
    const elasticFrame = () => {
      const e = elastic;
      if (!e) return;
      if (e.pull > 0 && performance.now() - e.lastInput > ELASTIC_IDLE_MS) releaseElastic(e);
      const target = e.edge + e.direction * stretch(e.pull);
      e.y += (target - e.y) * (e.pull > 0 ? 0.25 : 0.2);
      if (e.pull === 0 && Math.abs(target - e.y) < 0.5) {
        stopElastic();
        scrollInstantly(target);
        updateFade();
        return;
      }
      scrollInstantly(e.y);
      e.frame = requestAnimationFrame(elasticFrame);
    };

    // Adds `amount` of wheel input past `edge`, starting the stretch if needed.
    const pushElastic = (direction: SnapDirection, edge: number, amount: number) => {
      const now = performance.now();
      if (!elastic) {
        // Take over from wherever the smooth scroll has got to.
        scrollInstantly(window.scrollY);
        elastic = {
          direction, edge, pull: 0, peak: 0, y: window.scrollY, lastInput: now,
          frame: requestAnimationFrame(elasticFrame),
        };
      }
      const e = elastic;
      // Carry on from the current stretch, or from a push just let go of.
      const current = unstretch(Math.max(0, (e.y - e.edge) * e.direction));
      e.pull = Math.max(e.pull, current, recall(direction, now)) + Math.max(0, amount);
      e.peak = Math.max(e.peak, e.pull);
      e.lastInput = now;
      if (e.pull >= ELASTIC_THRESHOLD) {
        snapTo(direction);
        // Snapped over: the next stretch starts afresh.
        lastStretch = { direction, pull: 0, at: 0 };
      }
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
    // `momentum`: a fling's fading tail. `paging`: a whole-screen step (Page
    // Down, Space). `wheel`: a wheel push, which stretches before it snaps.
    const handleDirection = (
      direction: SnapDirection,
      event: Event,
      distance: number,
      { momentum = false, paging = false, wheel = false } = {},
    ) => {
      if (snapDirection !== null) {
        if (event.cancelable) event.preventDefault();
        if (direction !== snapDirection) snapTo(direction);
        return;
      }
      const y = window.scrollY;
      // Lenis may already be heading further than the visible position.
      const smoothScroll = getSmoothScroll();
      const from = smoothScroll?.isScrolling === 'smooth' ? smoothScroll.targetScroll : y;
      if (direction === -1) {
        downwardMomentumUntil = 0;
        upwardIntentUntil = performance.now() + UPWARD_INTENT_MS;
        upwardMomentum = momentum;
        if (!momentum && y > overviewEnd + 1 && y <= contentTop + DOCK_TOLERANCE) {
          if (event.cancelable) event.preventDefault();
          // At the top of the case study, a wheel push stretches first.
          if (wheel && y >= contentTop - 1) pushElastic(-1, contentTop, contentTop - (from - distance));
          else snapTo(-1);
        }
      } else {
        upwardIntentUntil = 0;
        upwardMomentum = false;
        if (!momentum) downwardMomentumUntil = 0;
        if (!snapped && y < contentTop - 1 && from + distance > overviewEnd + 1) {
          if (event.cancelable) event.preventDefault();
          // Coasting: stop at the snap point. A page step that would skip the
          // end of the overview stops there first. A wheel push stretches
          // past the snap point before it snaps; anything else snaps.
          if (paging && y < overviewEnd - 1) stopAtOverviewEnd(true);
          else if (momentum && y <= overviewEnd + 1) stopAtOverviewEnd(!!smoothScroll);
          else if (wheel && y <= overviewEnd + 1) pushElastic(1, overviewEnd, from + distance - overviewEnd);
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

      // While stretched, the wheel only works the stretch: pushing on adds to
      // it, pulling back or letting go (momentum) lets it spring back.
      if (elastic && snapDirection === null) {
        if (event.cancelable) event.preventDefault();
        if (direction !== elastic.direction) {
          // Pulling back lets go for good.
          elastic.pull = Math.max(0, elastic.pull - delta);
          lastStretch = { direction: elastic.direction, pull: 0, at: 0 };
        } else if (gesture.momentum) {
          releaseElastic(elastic);
          gesture.consumed = true;
        } else pushElastic(direction, elastic.edge, delta);
        return;
      }

      // Trackpad momentum can outlast the snap. Keep consuming the fading
      // tail; a renewed push, pause or reversal starts a fresh gesture.
      if (gesture.consumed && snapDirection === null) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      handleDirection(direction, event, delta * (smoothScroll?.options.wheelMultiplier ?? 1),
        { momentum: gesture.momentum, wheel: true });
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
      else if (event.key === 'PageDown' || event.key === ' ') handleDirection(1, event, page, { paging: true });
    };

    const onScroll = () => {
      const y = window.scrollY;
      const previousY = lastScrollY;
      const movingUp = y < previousY;
      lastScrollY = y;
      updateFade();
      // Back at the overview starts a new visit.
      if (y <= overviewEnd + 1 && snapDirection === null) snapped = false;
      if (!active() || snapDirection !== null || elastic) return;
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
        if (snapDirection !== null || elastic) cancelSnap();
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
      stopElastic();
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
