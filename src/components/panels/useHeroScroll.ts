'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { animate, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';
import { getSmoothScroll, scrollInstantly } from '@/lib/smooth-scroll';
import { createHeroTouchScroll } from '@/lib/hero-touch-scroll';

interface HeroScrollOptions {
  heroRef: RefObject<HTMLElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  ready: boolean;
  touchEnabled?: boolean;
  trackHeroState?: boolean;
  // Omit to keep the heading at its original viewport height.
  headingDockTop?: number;
  fitHeroToViewport?: boolean;
}

type SnapDirection = -1 | 1;
const DOCK_TOLERANCE = 48;
const UPWARD_INTENT_MS = 1500;
const WHEEL_GESTURE_IDLE_MS = 180;
const WHEEL_MOMENTUM_DECAY_EVENTS = 3;
const WHEEL_MOMENTUM_DECAY_RATIO = 0.8;

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

export function useHeroScroll({ heroRef, headingRef, enabled, ready, touchEnabled = true, trackHeroState = true, headingDockTop, fitHeroToViewport = false }: HeroScrollOptions) {
  const progress = useMotionValue(0);
  const headingY = useMotionValue(0);
  const projectsHeadingY = useMotionValue(0);
  const headingLift = useMotionValue(0);
  const [isAtHero, setIsAtHero] = useState(true);
  const atHeroRef = useRef(true);
  const lastSyncedYRef = useRef(0);
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
  const touchScrollRef = useRef<ReturnType<typeof createHeroTouchScroll> | null>(null);
  const headingTransitionRef = useRef<HeadingTransition | null>(null);
  const viewportProbeRef = useRef<HTMLDivElement | null>(null);

  const fitHeroViewport = useCallback((preservePosition = false) => {
    const hero = heroRef.current;
    const viewport = window.visualViewport;
    if (!fitHeroToViewport || !hero || (viewport && viewport.scale !== 1)) return;
    const height = Math.ceil(viewport?.height ?? window.innerHeight);
    if (height <= 0) return;
    const work = document.getElementById('work');
    const previousWorkTop = work ? documentTop(work) : 0;
    const previousY = window.scrollY;

    let probe = viewportProbeRef.current;
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
      document.body.appendChild(probe);
      viewportProbeRef.current = probe;
    }
    // Safari can paint beneath its floating controls even when every viewport
    // height excludes that area. The touch device's screen is a conservative
    // bound; keep this blank space separate from the visible hero and footer.
    const paintedHeight = Math.ceil(Math.max(
      height + (viewport?.offsetTop ?? 0),
      window.innerHeight,
      document.documentElement.clientHeight,
      probe.getBoundingClientRect().height,
      window.matchMedia('(pointer: coarse)').matches ? window.screen.height : 0,
    ));
    if (hero.style.getPropertyValue('--hero-viewport-height') !== `${height}px`) {
      hero.style.setProperty('--hero-viewport-height', `${height}px`);
    }
    const clearance = Math.max(0, paintedHeight - hero.offsetHeight);
    if (hero.style.getPropertyValue('--hero-bottom-clearance') !== `${clearance}px`) {
      hero.style.setProperty('--hero-bottom-clearance', `${clearance}px`);
    }
    const shift = work ? documentTop(work) - previousWorkTop : 0;
    // Hero height and blank clearance can change in opposite directions.
    // Preserve Projects using the total section movement before returning.
    if (preservePosition && shift !== 0 && previousY > heroTopRef.current + 1 &&
        previousY >= targetRef.current - 1) {
      scrollInstantly(previousY + shift);
    }
  }, [heroRef, fitHeroToViewport]);

  const syncScroll = useCallback((scrollY = window.scrollY) => {
    const y = Math.max(0, scrollY);
    const target = targetRef.current;
    const atHero = y <= heroTopRef.current + 1;
    lastSyncedYRef.current = y;
    if (atHero !== atHeroRef.current) {
      atHeroRef.current = atHero;
      if (trackHeroState) setIsAtHero(atHero);
    }
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
  }, [headingY, projectsHeadingY, progress, reducedMotion, trackHeroState]);

  const measure = useCallback(() => {
    // Freeze the hero while browsing Projects or animating. Safari's toolbar
    // changes must not move a snap destination in the middle of a gesture.
    if (snapDirectionRef.current === null && window.scrollY <= heroTopRef.current + 1) fitHeroViewport();
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
  }, [heroRef, headingRef, headingDockTop, headingLift, syncScroll, fitHeroViewport]);

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
    if (direction === -1) fitHeroViewport(true);
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
      if (direction === -1 && fitHeroToViewport) measure();
      else syncScroll(target);
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
  }, [enabled, measure, cancelSnap, projectsHeadingY, reducedMotion, syncScroll, fitHeroToViewport, fitHeroViewport]);

  const scrollToProjects = useCallback((focus = false) => {
    snapTo(1, focus);
  }, [snapTo]);

  const scrollToHero = useCallback(() => {
    snapTo(-1);
  }, [snapTo]);

  const touchCallbacksRef = useRef({ enabled, ready, snapTo, cancelSnap, syncScroll, reducedMotion });
  useLayoutEffect(() => {
    touchCallbacksRef.current = { enabled, ready, snapTo, cancelSnap, syncScroll, reducedMotion };
  }, [enabled, ready, snapTo, cancelSnap, syncScroll, reducedMotion]);

  // Reserve touch scrolling from mount, before the intro exposes any scroll
  // range. Read current callbacks without replacing a held gesture at ready.
  useLayoutEffect(() => {
    if (!touchEnabled) return;
    const touchScroll = createHeroTouchScroll({
      canSnap: () => touchCallbacksRef.current.enabled && touchCallbacksRef.current.ready,
      getSnapDirection: () => snapDirectionRef.current,
      getBounds: () => ({ heroTop: heroTopRef.current, projectsTop: targetRef.current }),
      scrollTo: (top) => {
        scrollInstantly(top);
        touchCallbacksRef.current.syncScroll(top);
      },
      snapTo: (direction) => touchCallbacksRef.current.snapTo(direction),
      cancelSnap: () => touchCallbacksRef.current.cancelSnap(),
      onTouchStart: () => {
        touchInputRef.current = true;
        upwardIntentUntilRef.current = 0;
        upwardMomentumRef.current = false;
        wheelGestureRef.current = null;
        // Contact alone must not strand the page between sections. A new
        // vertical movement takes over the snap through the callback above.
        if (snapDirectionRef.current === null && getSmoothScroll()?.isScrolling === 'smooth') {
          touchCallbacksRef.current.cancelSnap();
        }
      },
      get reducedMotion() { return !!touchCallbacksRef.current.reducedMotion; },
    });
    touchScrollRef.current = touchScroll;
    return () => {
      touchScroll.destroy();
      if (touchScrollRef.current === touchScroll) touchScrollRef.current = null;
    };
  }, [touchEnabled]);

  useLayoutEffect(() => {
    let frame = 0;
    let followupFrame = 0;
    let resizeFrame = 0;
    let disposed = false;
    let pendingLayoutResize = false;
    let lastScrollY = window.scrollY;
    let lastViewportWidth = window.innerWidth;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(observeLayout);
    });
    const observeLayout = () => {
      const work = document.getElementById('work');
      if (heroRef.current) observer.observe(heroRef.current);
      if (headingRef.current) observer.observe(headingRef.current);
      if (work) observer.observe(work);
      measure();
      touchScrollRef.current?.refresh();
    };
    const onResize = () => {
      const touchHeightResize = touchInputRef.current && window.innerWidth === lastViewportWidth;
      const previousHeroTop = heroTopRef.current;
      const previousTarget = targetRef.current;
      lastViewportWidth = window.innerWidth;
      if (!touchHeightResize) {
        pendingLayoutResize = true;
        touchScrollRef.current?.cancel();
        cancelSnap();
      }
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const measureLayout = pendingLayoutResize;
        pendingLayoutResize = false;
        // Safari animates its controls with repeated viewport height events.
        // Projects and active snaps keep their geometry frozen; update the
        // cached scroll range without reading section layout on each frame.
        if (fitHeroToViewport && touchHeightResize && !measureLayout &&
            (snapDirectionRef.current !== null || window.scrollY > heroTopRef.current + 1)) {
          touchScrollRef.current?.resizeViewport();
          return;
        }
        observeLayout();
        // A settled mobile hero can safely grow to fill the visible viewport
        // without releasing a finger still held after its return snap.
        const fittedAtHero = fitHeroToViewport && snapDirectionRef.current === null &&
          window.scrollY <= heroTopRef.current + 1;
        // A return may recalibrate the height between the resize event and
        // this frame. Its destination is still the unchanged top of the hero.
        const returningToFittedHero = fitHeroToViewport && snapDirectionRef.current === -1;
        if (touchHeightResize && (previousHeroTop !== heroTopRef.current ||
            (previousTarget !== targetRef.current && !fittedAtHero && !returningToFittedHero))) {
          touchScrollRef.current?.cancel();
          cancelSnap();
        }
      });
    };
    const onScroll = () => {
      const y = window.scrollY;
      const movingUp = y < lastScrollY;
      lastScrollY = y;
      // Touch animations already synchronized the precise scroll write. A
      // second update from the browser's rounded scroll event adds work and
      // can move the heading back by a pixel within the same display frame.
      if (touchInputRef.current && Math.abs(y - lastSyncedYRef.current) <= 1) return;
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
    if (fitHeroToViewport) window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(followupFrame);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (fitHeroToViewport) window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [heroRef, headingRef, enabled, ready, measure, syncScroll, cancelSnap, snapTo, stopAtProjects, fitHeroToViewport]);

  useEffect(() => {
    if (!enabled) return;

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
      touchScrollRef.current?.cancel();
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

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          isKeyboardControl(event.target)) return;
      touchInputRef.current = false;
      touchScrollRef.current?.cancel();
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
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
      wheelGestureRef.current = null;
    };
  }, [enabled, ready, snapTo, cancelSnap, stopAtProjects, reducedMotion, syncScroll]);

  useLayoutEffect(() => () => {
    animationRef.current?.stop();
    viewportProbeRef.current?.remove();
    viewportProbeRef.current = null;
  }, []);

  const cancelScroll = useCallback(() => {
    touchScrollRef.current?.cancel();
    cancelSnap();
  }, [cancelSnap]);

  return { progress, headingY, projectsHeadingY, headingLift, isAtHero, scrollToProjects, scrollToHero, cancelScroll };
}
