'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { animate, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';

interface HeroScrollOptions {
  heroRef: RefObject<HTMLElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  ready: boolean;
  // Omit to keep the heading at its original viewport height.
  headingDockTop?: number;
}

type SnapDirection = -1 | 1;
const DOCK_TOLERANCE = 48;
const UPWARD_INTENT_MS = 1500;
const WHEEL_GESTURE_IDLE_MS = 180;

interface WheelGesture {
  direction: SnapDirection;
  lastEventAt: number;
  lastDelta: number;
  previousDelta: number;
  consumed: boolean;
}

// offsetTop excludes the heading's scroll-driven transform. Its visual box
// must not become the next measurement's starting position as it moves.
function documentTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    !!target.closest('input, textarea, select, [role="textbox"]')
  );
}

function isKeyboardControl(target: EventTarget | null) {
  return isEditable(target) || (target instanceof HTMLElement && !!target.closest(
    'a[href], button, summary, [role="button"], [role="slider"], [role="listbox"], [role="menu"]',
  ));
}

export function useHeroScroll({ heroRef, headingRef, enabled, ready, headingDockTop }: HeroScrollOptions) {
  const progress = useMotionValue(0);
  const headingY = useMotionValue(0);
  const headingLift = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const targetRef = useRef(0);
  const heroTopRef = useRef(0);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const snapDirectionRef = useRef<SnapDirection | null>(null);
  const snappedRef = useRef(false);
  const upwardIntentUntilRef = useRef(0);
  const wheelGestureRef = useRef<WheelGesture | null>(null);

  const syncScroll = useCallback((scrollY = window.scrollY) => {
    const y = Math.max(0, scrollY);
    const target = targetRef.current;
    headingY.set(Math.min(y, target));
    progress.set(target > 0 ? Math.min(y / target, 1) : 0);
    // Returning all the way to the hero starts a new visit. Scroll restoration
    // itself never starts a snap; only the input handlers below can do that.
    if (y <= heroTopRef.current + 1 && snapDirectionRef.current === null) {
      snappedRef.current = false;
    }
  }, [headingY, progress]);

  const measure = useCallback(() => {
    const heading = headingRef.current;
    const work = document.getElementById('work');
    heroTopRef.current = heroRef.current ? documentTop(heroRef.current) : 0;
    const headingTop = heading ? documentTop(heading) : 0;
    headingLift.set(headingDockTop === undefined ? 0 : Math.max(0, headingTop - headingDockTop));
    targetRef.current = heading && work
      ? Math.max(0, documentTop(work) - headingTop - heading.offsetHeight + headingLift.get())
      : 0;
    syncScroll();
    return targetRef.current;
  }, [heroRef, headingRef, headingDockTop, headingLift, syncScroll]);

  const cancelSnap = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
    snapDirectionRef.current = null;
    upwardIntentUntilRef.current = 0;
    syncScroll();
  }, [syncScroll]);

  const snapTo = useCallback((direction: SnapDirection, focus = false) => {
    if (!enabled) return;
    const projectsTarget = measure();
    const work = document.getElementById('work');
    if (!work || projectsTarget <= 0) return;
    const target = direction === 1 ? projectsTarget : heroTopRef.current;

    cancelSnap();
    snappedRef.current = direction === 1;
    // A return snap can also start from onScroll after a large native wheel
    // delta crosses the dock. Consume that gesture's remaining momentum too.
    const wheelGesture = wheelGestureRef.current;
    if (wheelGesture?.direction === direction &&
        performance.now() - wheelGesture.lastEventAt < WHEEL_GESTURE_IDLE_MS) {
      wheelGesture.consumed = true;
    }
    const finish = () => {
      animationRef.current = null;
      snapDirectionRef.current = null;
      window.scrollTo({ top: target, behavior: 'instant' });
      syncScroll(target);
      if (focus && direction === 1) work.focus({ preventScroll: true });
    };

    if (reducedMotion || Math.abs(window.scrollY - target) < 1) {
      finish();
      return;
    }

    snapDirectionRef.current = direction;
    animationRef.current = animate(window.scrollY, target, {
      duration: direction === -1 ? 1.1 : 0.8,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (y) => {
        window.scrollTo({ top: y, behavior: 'instant' });
        syncScroll(y);
      },
      onComplete: finish,
    });
  }, [enabled, measure, cancelSnap, reducedMotion, syncScroll]);

  const scrollToProjects = useCallback((focus = false) => {
    snapTo(1, focus);
  }, [snapTo]);

  useLayoutEffect(() => {
    let frame = 0;
    let followupFrame = 0;
    let disposed = false;
    let lastScrollY = window.scrollY;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    const observeLayout = () => {
      const work = document.getElementById('work');
      if (heroRef.current) observer.observe(heroRef.current);
      if (headingRef.current) observer.observe(headingRef.current);
      if (work) observer.observe(work);
      measure();
    };
    const onResize = () => {
      cancelSnap();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(observeLayout);
    };
    const onScroll = () => {
      const y = window.scrollY;
      const movingUp = y < lastScrollY;
      lastScrollY = y;
      syncScroll(y);
      const hasUpwardIntent = performance.now() < upwardIntentUntilRef.current;
      if (hasUpwardIntent && movingUp && snapDirectionRef.current === null) {
        // Touch momentum can outlive the last touchmove event. Keep that
        // intent alive while the page continues moving upward naturally.
        upwardIntentUntilRef.current = performance.now() + UPWARD_INTENT_MS;
      }
      // Deep project browsing stays native. A large wheel delta, Page Up, or
      // touch momentum can cross the dock in one frame, so start the return
      // only after that user-driven movement actually reaches the boundary.
      if (enabled && ready && snapDirectionRef.current === null && movingUp &&
          hasUpwardIntent &&
          y > heroTopRef.current + 1 && targetRef.current > 0 &&
          y <= targetRef.current + DOCK_TOLERANCE) {
        snapTo(-1);
      }
    };

    observeLayout();
    // The section may have mounted in this same commit. Re-read its final
    // layout after Motion and the local font have finished their first paint.
    frame = requestAnimationFrame(() => {
      observeLayout();
      followupFrame = requestAnimationFrame(observeLayout);
    });
    document.fonts.ready.then(() => {
      if (!disposed) observeLayout();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(followupFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelSnap();
    };
  }, [heroRef, headingRef, enabled, ready, measure, syncScroll, cancelSnap, snapTo]);

  useEffect(() => {
    if (!enabled) return;

    const handleDirection = (direction: SnapDirection, event: Event) => {
      const activeDirection = snapDirectionRef.current;
      if (activeDirection !== null) {
        if (event.cancelable) event.preventDefault();
        if (direction !== activeDirection) snapTo(direction);
        return;
      }
      if (!ready) return;
      const y = window.scrollY;
      const target = targetRef.current;
      if (direction === -1) {
        upwardIntentUntilRef.current = performance.now() + UPWARD_INTENT_MS;
        if (target > 0 && y > heroTopRef.current + 1 && y <= target + DOCK_TOLERANCE) {
          if (event.cancelable) event.preventDefault();
          snapTo(-1);
        }
      } else {
        upwardIntentUntilRef.current = 0;
        if (!snappedRef.current && target > 0 && y >= heroTopRef.current - 1 && y < target - 1) {
          if (event.cancelable) event.preventDefault();
          snapTo(1);
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          event.shiftKey || isEditable(event.target) ||
          Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const direction = event.deltaY < 0 ? -1 : 1;
      const now = performance.now();
      const delta = Math.abs(event.deltaY) * (
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      );
      let gesture = wheelGestureRef.current;
      const recentPeak = gesture ? Math.max(gesture.lastDelta, gesture.previousDelta) : 0;
      // A fresh push accelerates again, unlike the fading momentum from the
      // snap. Accept a clear increase immediately, or a gentler two-event ramp.
      const renewedPush = gesture?.consumed && snapDirectionRef.current === null && (
        (delta > recentPeak * 1.25 && delta - recentPeak >= 3) ||
        (delta >= 6 && gesture.lastDelta > gesture.previousDelta && delta > gesture.lastDelta &&
          delta > gesture.previousDelta * 1.25 && delta - gesture.previousDelta >= 2)
      );
      if (!gesture || gesture.direction !== direction ||
          now - gesture.lastEventAt >= WHEEL_GESTURE_IDLE_MS || renewedPush) {
        gesture = {
          direction,
          lastEventAt: now,
          lastDelta: delta,
          previousDelta: delta,
          consumed: false,
        };
        wheelGestureRef.current = gesture;
      }
      gesture.lastEventAt = now;
      gesture.previousDelta = gesture.lastDelta;
      gesture.lastDelta = delta;

      // Trackpad momentum can outlast the snap animation. Keep consuming the
      // fading tail; a renewed push, pause, or reversal starts a fresh gesture.
      if (gesture.consumed && snapDirectionRef.current === null) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      handleDirection(direction, event);
      if (snapDirectionRef.current !== null || event.defaultPrevented) {
        gesture.consumed = true;
      }
    };

    let touch: { x: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isEditable(event.target)) {
        touch = null;
        upwardIntentUntilRef.current = 0;
        if (snapDirectionRef.current !== null) cancelSnap();
        return;
      }
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1 || event.defaultPrevented) return;
      const next = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      const dx = touch.x - next.x;
      const dy = touch.y - next.y;
      // Accumulate small touch movements until the direction is clear, and
      // leave horizontal swipes and pinch gestures to the browser.
      if (snapDirectionRef.current === null && Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      touch = next;
      if (Math.abs(dy) <= Math.abs(dx)) return;
      handleDirection(dy < 0 ? -1 : 1, event);
    };
    const clearTouch = () => { touch = null; };
    const cancelTouch = () => {
      touch = null;
      upwardIntentUntilRef.current = 0;
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          isKeyboardControl(event.target)) return;
      if (event.key === 'Home' || event.key === 'End' || event.key === 'Escape') {
        upwardIntentUntilRef.current = 0;
        if (snapDirectionRef.current !== null) cancelSnap();
        return;
      }
      const upward = event.key === 'ArrowUp' || event.key === 'PageUp' ||
        (event.key === ' ' && event.shiftKey);
      if (upward && (!event.shiftKey || event.key === ' ')) {
        handleDirection(-1, event);
        return;
      }
      if (event.shiftKey) return;
      const downward = event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ';
      if (downward) handleDirection(1, event);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', clearTouch, { passive: true });
    window.addEventListener('touchcancel', cancelTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', clearTouch);
      window.removeEventListener('touchcancel', cancelTouch);
      window.removeEventListener('keydown', onKey);
      wheelGestureRef.current = null;
    };
  }, [enabled, ready, snapTo, cancelSnap]);

  return { progress, headingY, headingLift, scrollToProjects };
}
