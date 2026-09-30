type Direction = -1 | 1;

const HORIZONTAL_THRESHOLD = 6;
const DOCK_TOLERANCE = 48;
const REVERSAL_THRESHOLD = 12;
const VELOCITY_WINDOW_MS = 80;
const RELEASE_PAUSE_MS = 100;
const INERTIA_TIME_MS = 325;
const MAX_VELOCITY = 3;

interface TouchScrollOptions {
  canSnap?: () => boolean;
  getBounds: () => { heroTop: number; projectsTop: number };
  scrollTo: (top: number) => void;
  snapTo: (direction: Direction) => void;
  cancelSnap: () => void;
  onTouchStart: () => void;
  reducedMotion: boolean;
}

interface Gesture {
  identifier: number;
  source: 'pointer' | 'touch' | null;
  startX: number;
  startY: number;
  lastY: number;
  position: number;
  claimed: boolean;
  axis: 'vertical' | 'horizontal' | null;
  consumed: boolean;
  direction: Direction | null;
  movedDown: boolean;
  upwardTravel: number;
  samples: { at: number; position: number }[];
}

function needsNativeTouch(target: EventTarget | null) {
  if (window.visualViewport && window.visualViewport.scale > 1) return true;
  if (!(target instanceof Element)) return true;
  if ((target instanceof HTMLElement && target.isContentEditable) || target.closest(
    'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"]), ' +
    '[data-lenis-prevent], [data-lenis-prevent-touch], [data-lenis-prevent-vertical]',
  )) return true;
  // Scrollable menus and other nested scroll areas retain their own gestures.
  for (let element: Element | null = target;
    element && element !== document.body && element !== document.documentElement;
    element = element.parentElement) {
    const style = getComputedStyle(element);
    if ((/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) ||
        (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth)) return true;
  }
  return false;
}

// A vertical page gesture has one scroll owner from its first movement to
// release. Native scrolling cannot be taken over halfway through a swipe.
export function createHeroTouchScroll(options: TouchScrollOptions) {
  let gesture: Gesture | null = null;
  let dragFrame = 0;
  let inertiaFrame = 0;
  let pendingDirection: Direction | null = null;
  let contentHeight = 0;
  let scrollLimit = 0;
  const rootStyle = document.documentElement.style;
  const previousTouchAction = rootStyle.touchAction;
  const previousPageAction = rootStyle.getPropertyValue('--hero-touch-action');
  const viewport = window.visualViewport;
  let ownsVerticalTouch = false;

  const resizeViewport = () => {
    scrollLimit = Math.max(0, contentHeight - window.innerHeight);
  };
  const updateLimit = () => {
    contentHeight = document.documentElement.scrollHeight;
    resizeViewport();
  };
  const clamp = (top: number) => Math.max(0, Math.min(top, scrollLimit));

  const stopFrames = () => {
    cancelAnimationFrame(dragFrame);
    cancelAnimationFrame(inertiaFrame);
    dragFrame = inertiaFrame = 0;
  };
  const cancel = () => {
    stopFrames();
    gesture = null;
    pendingDirection = null;
  };
  const abandonGesture = () => {
    const consumed = gesture?.consumed;
    cancel();
    if (consumed) options.cancelSnap();
  };
  const updateTouchAction = () => {
    // Declare ownership before contact: preventing a later touchmove cannot
    // reclaim a pan the browser has already started. Zoomed pages pan natively.
    const zoomed = viewport && viewport.scale > 1;
    const action = zoomed ? previousTouchAction : 'pan-x pinch-zoom';
    const pageAction = zoomed ? 'auto' : 'pan-x pinch-zoom';
    if (rootStyle.touchAction !== action) rootStyle.touchAction = action;
    if (rootStyle.getPropertyValue('--hero-touch-action') !== pageAction) {
      rootStyle.setProperty('--hero-touch-action', pageAction);
    }
    ownsVerticalTouch = !zoomed && rootStyle.touchAction === 'pan-x pinch-zoom';
    if (zoomed) abandonGesture();
  };
  const flushDrag = () => {
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (gesture?.axis === 'vertical' && !gesture.consumed) options.scrollTo(gesture.position);
  };
  const snap = (direction: Direction) => {
    stopFrames();
    if (gesture) gesture.consumed = true;
    options.snapTo(direction);
  };
  const refresh = () => {
    updateLimit();
    const { heroTop, projectsTop } = options.getBounds();
    if (pendingDirection !== null && options.canSnap?.() !== false && projectsTop > heroTop) {
      const direction = pendingDirection;
      pendingDirection = null;
      snap(direction);
    }
  };
  const onStart = (event: TouchEvent) => {
    cancel();
    options.onTouchStart();
    if (event.touches.length !== 1 || event.defaultPrevented || needsNativeTouch(event.target)) return;
    updateLimit();
    const finger = event.touches[0];
    gesture = {
      identifier: finger.identifier,
      source: null,
      startX: finger.clientX,
      startY: finger.clientY,
      lastY: finger.clientY,
      position: clamp(window.scrollY),
      claimed: false,
      axis: null,
      consumed: false,
      direction: null,
      movedDown: false,
      upwardTravel: 0,
      samples: [{ at: performance.now(), position: clamp(window.scrollY) }],
    };
  };
  const moveFinger = (clientX: number, clientY: number) => {
    if (!gesture) return false;
    // Consume even after the snap has completed while the finger is held.
    if (gesture.consumed) return true;
    if (gesture.axis === null) {
      const dx = Math.abs(gesture.startX - clientX);
      const dy = Math.abs(gesture.startY - clientY);
      if (dx > dy && dx >= HORIZONTAL_THRESHOLD) {
        gesture.axis = 'horizontal';
        return false;
      }
      // A vertical motion starts immediately, including a single pixel.
      // Small sideways jitter can still resolve into either axis.
      if (dy <= dx) return true;
      gesture.axis = 'vertical';
      gesture.claimed = true;
    }
    if (gesture.axis !== 'vertical') return false;

    const delta = gesture.lastY - clientY;
    gesture.lastY = clientY;
    if (delta === 0) return true;
    if (options.canSnap?.() === false) {
      // An intro swipe keeps its owner even while Projects is mounting. Save
      // intent instead of starting native scrolling, including after release.
      pendingDirection = delta > 0 ? 1 : -1;
      gesture.consumed = true;
      return true;
    }
    const { heroTop, projectsTop } = options.getBounds();
    let next = clamp(gesture.position + delta);
    if (delta > 0) {
      gesture.movedDown = true;
      gesture.upwardTravel = 0;
    } else {
      gesture.upwardTravel -= delta;
    }
    if (projectsTop > heroTop && delta > 0 &&
        gesture.position >= heroTop - 1 && gesture.position < projectsTop - 1) {
      snap(1);
      return true;
    }
    if (projectsTop > heroTop && delta < 0 && gesture.position > heroTop + 1 &&
        next <= projectsTop + DOCK_TOLERANCE) {
      // A fresh upward swipe snaps immediately. Once this contact has moved
      // down the list, a small correction must not become a return to Hero.
      if (!gesture.movedDown || gesture.upwardTravel >= REVERSAL_THRESHOLD) {
        // Commit a drag from the list at the dock. Inside the transition,
        // start from the visible position without jumping by the last delta.
        if (gesture.position >= projectsTop) {
          gesture.position = Math.max(next, projectsTop);
          flushDrag();
        }
        snap(-1);
        return true;
      }
      next = Math.max(next, projectsTop);
    }
    // Preserve subpixel input across events instead of accumulating the
    // browser's rounded scrollY, and write at most once per display frame.
    const movement = next - gesture.position;
    const direction = movement < 0 ? -1 : 1;
    if (movement !== 0 && gesture.direction !== null && direction !== gesture.direction) {
      // Estimate release speed from the latest push. Averaging across a
      // reversal can otherwise fling in the opposite direction to the finger.
      gesture.samples = [gesture.samples[gesture.samples.length - 1]];
    }
    if (movement !== 0) gesture.direction = direction;
    gesture.position = next;
    const now = performance.now();
    gesture.samples.push({ at: now, position: next });
    while (gesture.samples.length > 2 && gesture.samples[1].at < now - VELOCITY_WINDOW_MS) {
      gesture.samples.shift();
    }
    if (!dragFrame) dragFrame = requestAnimationFrame(flushDrag);
    return true;
  };
  const onPointerMove = (event: PointerEvent) => {
    // Touch pointer movement arrives before touchmove's browser slop. Mouse
    // and pen input never enter this path; Touch Events track contact lifetime.
    if (!gesture || !ownsVerticalTouch || event.pointerType !== 'touch' || !event.isPrimary) return;
    if (event.defaultPrevented) {
      abandonGesture();
      return;
    }
    if (gesture.source === 'touch') return;
    // The two event streams can arrive with different coordinates. Keep the
    // first moving stream for this contact, so late events cannot reverse it.
    if (event.clientX !== gesture.startX || event.clientY !== gesture.startY) gesture.source = 'pointer';
    moveFinger(event.clientX, event.clientY);
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && event.isPrimary) abandonGesture();
  };
  const onMove = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 1 || event.defaultPrevented ||
        event.touches[0].identifier !== gesture.identifier) {
      abandonGesture();
      return;
    }
    if (gesture.axis === 'horizontal') return;
    if (!event.cancelable && !ownsVerticalTouch) {
      abandonGesture();
      return;
    }
    const finger = event.touches[0];
    if (gesture.source === 'pointer') {
      // Touch Events still own prevention and contact lifetime. Pointer
      // Events supply movement before the browser's touchmove threshold.
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (finger.clientX !== gesture.startX || finger.clientY !== gesture.startY) gesture.source = 'touch';
    if (moveFinger(finger.clientX, finger.clientY) && event.cancelable) event.preventDefault();
  };
  const onEnd = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 0) {
      abandonGesture();
      return;
    }
    flushDrag();
    const released = gesture;
    // Pointer movement can start a snap before the browser's tap slop. Do
    // not let releasing that swipe synthesize a click on its starting link.
    if (released.claimed && released.axis === 'vertical' && event.cancelable) event.preventDefault();
    gesture = null;
    if (!released.claimed || released.axis !== 'vertical' || released.consumed || options.reducedMotion) return;
    const now = performance.now();
    const last = released.samples[released.samples.length - 1];
    if (now - last.at > RELEASE_PAUSE_MS) return;
    const first = released.samples.find((sample) => sample.at >= last.at - VELOCITY_WINDOW_MS);
    if (!first || last.at <= first.at) return;
    const velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY,
      (last.position - first.position) / (last.at - first.at),
    ));
    if (Math.abs(velocity) < 0.05) return;
    updateLimit();
    const from = released.position;
    let target = clamp(from + velocity * INERTIA_TIME_MS);
    const { projectsTop } = options.getBounds();
    // A fling from the work list docks at Projects. Returning to the hero
    // requires another deliberate swipe, as it does for trackpad momentum.
    if (velocity < 0 && from >= projectsTop && projectsTop > 0) target = Math.max(target, projectsTop);
    const distance = target - from;
    if (Math.abs(distance) < 0.5) return;
    // Shorten the decay near an edge while preserving the release velocity,
    // so arriving at the dock slows down instead of being abruptly clamped.
    const decayTime = Math.abs(distance / velocity);
    const coast = (time: number) => {
      const remaining = Math.exp(-(time - now) / decayTime);
      const position = target - distance * remaining;
      if (Math.abs(target - position) < 0.5) {
        inertiaFrame = 0;
        options.scrollTo(target);
        return;
      }
      options.scrollTo(position);
      inertiaFrame = requestAnimationFrame(coast);
    };
    inertiaFrame = requestAnimationFrame(coast);
  };

  updateLimit();
  updateTouchAction();
  viewport?.addEventListener('resize', updateTouchAction);
  window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  window.addEventListener('pointercancel', onPointerCancel, { passive: true, capture: true });
  window.addEventListener('touchstart', onStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onMove, { passive: false, capture: true });
  window.addEventListener('touchend', onEnd, { passive: false, capture: true });
  window.addEventListener('touchcancel', abandonGesture, { passive: true, capture: true });
  return {
    cancel,
    refresh,
    resizeViewport,
    destroy: () => {
      cancel();
      viewport?.removeEventListener('resize', updateTouchAction);
      rootStyle.touchAction = previousTouchAction;
      if (previousPageAction) rootStyle.setProperty('--hero-touch-action', previousPageAction);
      else rootStyle.removeProperty('--hero-touch-action');
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointercancel', onPointerCancel, { capture: true });
      window.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', abandonGesture, { capture: true });
    },
  };
}
