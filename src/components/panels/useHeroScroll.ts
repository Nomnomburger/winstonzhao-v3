'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { animate, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';
import { getSmoothScroll, scrollInstantly } from '@/lib/smooth-scroll';

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
const WHEEL_MOMENTUM_DECAY_EVENTS = 3;
const WHEEL_MOMENTUM_DECAY_RATIO = 0.8;
const TOUCH_DIRECTION_THRESHOLD = 6;
const TOUCH_SCROLL_IDLE_MS = 120;

interface WheelGesture {
  direction: SnapDirection;
  lastEventAt: number;
  lastDelta: number;
  previousDelta: number;
  decayStartDelta: number;
  decayingEvents: number;
  momentum: boolean;
  consumed: boolean;
}

interface HeadingTransition {
  from: number;
  to: number;
  fromHeadingY: number;
  toHeadingY: number;
  previous: HeadingTransition | null;
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
  const projectsHeadingY = useMotionValue(0);
  const headingLift = useMotionValue(0);
  const [isAtHero, setIsAtHero] = useState(true);
  const reducedMotion = useReducedMotion();
  const targetRef = useRef(0);
  const heroTopRef = useRef(0);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const snapDirectionRef = useRef<SnapDirection | null>(null);
  const snappedRef = useRef(false);
  const upwardIntentUntilRef = useRef(0);
  const upwardMomentumRef = useRef(false);
  const wheelGestureRef = useRef<WheelGesture | null>(null);
  const touchInputRef = useRef(false);
  const headingTransitionRef = useRef<HeadingTransition | null>(null);

  const syncScroll = useCallback((scrollY = window.scrollY) => {
    const y = Math.max(0, scrollY);
    const target = targetRef.current;
    const atHero = y <= heroTopRef.current + 1;
    setIsAtHero(atHero);
    headingY.set(Math.min(y, target));
    let titleY = Math.min(y, target);
    // Returning to hero settles the title over the same scroll animation as
    // the photos. Keep this mapping on interruption so the title cannot jump.
    if (reducedMotion) headingTransitionRef.current = null;
    let transition = headingTransitionRef.current;
    while (transition) {
      const fraction = (y - transition.from) / (transition.to - transition.from);
      if (fraction >= 1) {
        headingTransitionRef.current = null;
        break;
      }
      if (fraction < 0) {
        transition = transition.previous;
        headingTransitionRef.current = transition;
        continue;
      }
      titleY = transition.fromHeadingY + (transition.toHeadingY - transition.fromHeadingY) * fraction;
      break;
    }
    projectsHeadingY.set(titleY);
    progress.set(target > 0 ? Math.min(y / target, 1) : 0);
    // Returning all the way to the hero starts a new visit. Scroll restoration
    // itself never starts a snap; only the input handlers below can do that.
    if (atHero && snapDirectionRef.current === null) {
      snappedRef.current = false;
    }
  }, [headingY, projectsHeadingY, progress, reducedMotion]);

  const measure = useCallback(() => {
    const heading = headingRef.current;
    const work = document.getElementById('work');
    const previousHeroTop = heroTopRef.current;
    const previousTarget = targetRef.current;
    heroTopRef.current = heroRef.current ? documentTop(heroRef.current) : 0;
    const headingTop = heading ? documentTop(heading) : 0;
    headingLift.set(headingDockTop === undefined ? 0 : Math.max(0, headingTop - headingDockTop));
    targetRef.current = heading && work
      ? Math.max(0, documentTop(work) - headingTop - heading.offsetHeight + headingLift.get())
      : 0;
    if (previousHeroTop !== heroTopRef.current || previousTarget !== targetRef.current) {
      headingTransitionRef.current = null;
    }
    syncScroll();
    return targetRef.current;
  }, [heroRef, headingRef, headingDockTop, headingLift, syncScroll]);

  const cancelSnap = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
    snapDirectionRef.current = null;
    upwardIntentUntilRef.current = 0;
    upwardMomentumRef.current = false;
    scrollInstantly(window.scrollY);
    syncScroll();
  }, [syncScroll]);

  const stopAtProjects = useCallback((smooth = false) => {
    const target = targetRef.current;
    snappedRef.current = true;
    if (wheelGestureRef.current?.direction === -1) {
      wheelGestureRef.current.consumed = true;
    }
    const smoothScroll = smooth ? getSmoothScroll() : null;
    if (smoothScroll) {
      // Clamp the destination before arriving, so Lenis slows to this edge
      // using the same easing as the top and bottom of the document.
      smoothScroll.scrollTo(target, {
        programmatic: false,
        lerp: smoothScroll.options.lerp,
      });
      return;
    }
    scrollInstantly(target);
    syncScroll(target);
  }, [syncScroll]);

  const snapTo = useCallback((direction: SnapDirection, focus = false) => {
    if (direction === 1 && !enabled) return;
    const projectsTarget = measure();
    const work = document.getElementById('work');
    if (direction === 1 && (!work || projectsTarget <= 0)) return;
    const target = direction === 1 ? projectsTarget : heroTopRef.current;

    cancelSnap();
    snappedRef.current = direction === 1;
    // A return snap can also start from onScroll after deliberate input
    // crosses the dock. Consume that gesture's remaining momentum too.
    const wheelGesture = wheelGestureRef.current;
    if (wheelGesture?.direction === direction &&
        performance.now() - wheelGesture.lastEventAt < WHEEL_GESTURE_IDLE_MS) {
      wheelGesture.consumed = true;
    }
    const finish = () => {
      animationRef.current = null;
      snapDirectionRef.current = null;
      headingTransitionRef.current = null;
      scrollInstantly(target);
      syncScroll(target);
      if (focus && direction === 1) work?.focus({ preventScroll: true });
    };

    if (reducedMotion || Math.abs(window.scrollY - target) < 1) {
      finish();
      return;
    }

    snapDirectionRef.current = direction;
    if (direction === -1 || headingTransitionRef.current) {
      headingTransitionRef.current = {
        from: window.scrollY,
        to: target,
        fromHeadingY: projectsHeadingY.get(),
        toHeadingY: Math.min(target, projectsTarget),
        previous: headingTransitionRef.current,
      };
    }
    animationRef.current = animate(window.scrollY, target, {
      duration: direction === -1 ? 1.1 : 0.8,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (y) => {
        scrollInstantly(y);
        syncScroll(y);
      },
      onComplete: finish,
    });
  }, [enabled, measure, cancelSnap, projectsHeadingY, reducedMotion, syncScroll]);

  const scrollToProjects = useCallback((focus = false) => {
    snapTo(1, focus);
  }, [snapTo]);

  const scrollToHero = useCallback(() => {
    snapTo(-1);
  }, [snapTo]);

  useLayoutEffect(() => {
    let frame = 0;
    let followupFrame = 0;
    let resizeFrame = 0;
    let disposed = false;
    let lastScrollY = window.scrollY;
    let lastViewportWidth = window.innerWidth;
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
      const touchHeightResize = touchInputRef.current && window.innerWidth === lastViewportWidth;
      const previousHeroTop = heroTopRef.current;
      const previousTarget = targetRef.current;
      lastViewportWidth = window.innerWidth;
      if (!touchHeightResize) cancelSnap();
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        observeLayout();
        // Mobile toolbars resize the viewport during a swipe, but the svh
        // hero keeps its layout. Only cancel if a snap destination changed.
        if (touchHeightResize && (previousHeroTop !== heroTopRef.current || previousTarget !== targetRef.current)) {
          cancelSnap();
        }
      });
    };
    const onScroll = () => {
      const y = window.scrollY;
      const movingUp = y < lastScrollY;
      lastScrollY = y;
      const hasUpwardIntent = performance.now() < upwardIntentUntilRef.current;
      if (hasUpwardIntent && upwardMomentumRef.current && movingUp && snapDirectionRef.current === null) {
        // Uncancelable wheel momentum can keep scrolling after input ends.
        // Keep its guard alive without granting permission to return to hero.
        upwardIntentUntilRef.current = performance.now() + UPWARD_INTENT_MS;
      }
      if (enabled && ready && snapDirectionRef.current === null && movingUp &&
          hasUpwardIntent && upwardMomentumRef.current && targetRef.current > 0 &&
          y <= targetRef.current) {
        if (getSmoothScroll()?.targetScroll === targetRef.current && y >= targetRef.current - 1) {
          // A rounded final Lenis frame can reach the edge before its easing
          // completes. Leave that last frame under the scroll engine's control.
          syncScroll(y);
          return;
        }
        // Catch overshoots, including a fling that reaches hero in one frame
        // or a wheel event the browser would not let us cancel.
        stopAtProjects();
        lastScrollY = targetRef.current;
        return;
      }
      syncScroll(y);
      // Deliberate input may still cross the dock in a single native frame.
      if (enabled && ready && snapDirectionRef.current === null && movingUp &&
          hasUpwardIntent && !upwardMomentumRef.current &&
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
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelSnap();
    };
  }, [heroRef, headingRef, enabled, ready, measure, syncScroll, cancelSnap, snapTo, stopAtProjects]);

  useEffect(() => {
    if (!enabled) return;

    let touchSettleFrame = 0;
    const cancelTouchSettling = () => {
      cancelAnimationFrame(touchSettleFrame);
      touchSettleFrame = 0;
    };

    const handleDirection = (direction: SnapDirection, event: Event, momentum = false) => {
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
        upwardMomentumRef.current = momentum;
        if (!momentum && target > 0 && y > heroTopRef.current + 1 && y <= target + DOCK_TOLERANCE) {
          if (event.cancelable) event.preventDefault();
          snapTo(-1);
        }
      } else {
        upwardIntentUntilRef.current = 0;
        upwardMomentumRef.current = false;
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
      touchInputRef.current = false;
      cancelTouchSettling();
      const direction = event.deltaY < 0 ? -1 : 1;
      const now = performance.now();
      const smoothScroll = getSmoothScroll();
      const delta = Math.abs(event.deltaY) * (
        event.deltaMode === 1 ? (smoothScroll ? 100 / 6 : 16) :
          event.deltaMode === 2 ? window.innerHeight : 1
      );
      let gesture = wheelGestureRef.current;
      const recentPeak = gesture ? Math.max(gesture.lastDelta, gesture.previousDelta) : 0;
      // A fresh push accelerates again, unlike the fading momentum from the
      // snap. Accept a clear increase immediately, or a gentler two-event ramp.
      const renewedPush = (gesture?.consumed || gesture?.momentum) && snapDirectionRef.current === null && (
        (delta > recentPeak * 1.25 && delta - recentPeak >= 3) ||
        (delta >= 6 && gesture.lastDelta > gesture.previousDelta && delta > gesture.lastDelta &&
          delta > gesture.previousDelta * 1.25 && delta - gesture.previousDelta >= 2)
      );
      if (!gesture || gesture.direction !== direction ||
          now - gesture.lastEventAt >= WHEEL_GESTURE_IDLE_MS || renewedPush) {
        if (gesture?.consumed && gesture.momentum && snapDirectionRef.current === null &&
            smoothScroll?.isScrolling === 'smooth') {
          // A fresh gesture takes over from the visible position, so reversing
          // cannot keep drifting toward the old Projects destination.
          scrollInstantly(window.scrollY);
        }
        gesture = {
          direction,
          lastEventAt: now,
          lastDelta: delta,
          previousDelta: delta,
          decayStartDelta: delta,
          decayingEvents: 0,
          momentum: false,
          consumed: false,
        };
        wheelGestureRef.current = gesture;
      }
      // WheelEvent has no momentum phase. Infer a fading tail from sustained
      // decay, allowing steady input and small fluctuations to keep snapping.
      if (delta < gesture.lastDelta) {
        gesture.decayingEvents += 1;
        if (gesture.decayingEvents >= WHEEL_MOMENTUM_DECAY_EVENTS &&
            delta <= gesture.decayStartDelta * WHEEL_MOMENTUM_DECAY_RATIO) {
          gesture.momentum = true;
        }
      } else if (delta > gesture.lastDelta) {
        gesture.decayStartDelta = delta;
        gesture.decayingEvents = 0;
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
      handleDirection(direction, event, gesture.momentum);
      if (direction === -1 && gesture.momentum && ready &&
          snapDirectionRef.current === null && targetRef.current > 0 &&
          window.scrollY >= targetRef.current &&
          (smoothScroll ? smoothScroll.targetScroll - delta * smoothScroll.options.wheelMultiplier :
            window.scrollY - delta) <= targetRef.current) {
        if (event.cancelable) event.preventDefault();
        stopAtProjects(!!smoothScroll);
      }
      if (snapDirectionRef.current !== null || event.defaultPrevented) {
        gesture.consumed = true;
      }
    };

    // Touch owns native scrolling until both the finger and its momentum
    // stop. Animating from touchmove fights the browser's scrolling and lets
    // tiny direction changes repeatedly reverse a snap.
    let touch: {
      identifier: number;
      x: number;
      y: number;
      axis: 'horizontal' | 'vertical' | null;
      direction: SnapDirection | null;
    } | null = null;
    const cancelTouch = () => {
      touch = null;
      upwardIntentUntilRef.current = 0;
      upwardMomentumRef.current = false;
      cancelTouchSettling();
    };
    const onTouchStart = (event: TouchEvent) => {
      cancelTouch();
      touchInputRef.current = true;
      if (snapDirectionRef.current !== null) cancelSnap();
      if (event.touches.length !== 1 || isEditable(event.target)) return;
      const finger = event.touches[0];
      touch = { identifier: finger.identifier, x: finger.clientX, y: finger.clientY, axis: null, direction: null };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch) return;
      if (event.touches.length !== 1 || event.defaultPrevented ||
          event.touches[0].identifier !== touch.identifier) {
        cancelTouch();
        return;
      }
      const finger = event.touches[0];
      const dx = touch.x - finger.clientX;
      const dy = touch.y - finger.clientY;
      if (touch.axis === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TOUCH_DIRECTION_THRESHOLD) return;
        touch.axis = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
      }
      if (touch.axis !== 'vertical' || Math.abs(dy) < TOUCH_DIRECTION_THRESHOLD) return;
      touch.y = finger.clientY;
      touch.direction = dy < 0 ? -1 : 1;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const direction = touch?.direction;
      touch = null;
      if (!direction || event.touches.length !== 0 || !ready) return;
      let lastY = window.scrollY;
      let idleSince = performance.now();
      const settle = () => {
        const y = window.scrollY;
        const now = performance.now();
        if (y !== lastY) {
          lastY = y;
          idleSince = now;
        }
        if (now - idleSince < TOUCH_SCROLL_IDLE_MS) {
          touchSettleFrame = requestAnimationFrame(settle);
          return;
        }
        touchSettleFrame = 0;
        const target = targetRef.current;
        if (target <= 0 || snapDirectionRef.current !== null) return;
        if (direction === 1 && y >= heroTopRef.current - 1 && y < target - 1) {
          snapTo(1);
        } else if (direction === -1 && y > heroTopRef.current + 1 && y <= target + DOCK_TOLERANCE) {
          snapTo(-1);
        }
      };
      touchSettleFrame = requestAnimationFrame(settle);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          isKeyboardControl(event.target)) return;
      touchInputRef.current = false;
      cancelTouchSettling();
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

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', cancelTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', cancelTouch);
      window.removeEventListener('keydown', onKey);
      cancelTouchSettling();
      wheelGestureRef.current = null;
    };
  }, [enabled, ready, snapTo, cancelSnap, stopAtProjects]);

  return { progress, headingY, projectsHeadingY, headingLift, isAtHero, scrollToProjects, scrollToHero };
}
