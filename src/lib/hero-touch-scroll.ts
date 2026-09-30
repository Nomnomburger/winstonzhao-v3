type Direction = -1 | 1;

const DIRECTION_THRESHOLD = 6;
const DOCK_TOLERANCE = 48;
const VELOCITY_WINDOW_MS = 80;
const RELEASE_PAUSE_MS = 100;
const INERTIA_TIME_MS = 325;
const MAX_VELOCITY = 3;

interface TouchScrollOptions {
  getBounds: () => { heroTop: number; projectsTop: number };
  scrollTo: (top: number) => void;
  snapTo: (direction: Direction) => void;
  cancelSnap: () => void;
  onTouchStart: () => void;
  reducedMotion: boolean;
}

interface Gesture {
  identifier: number;
  startX: number;
  startY: number;
  lastY: number;
  position: number;
  claimed: boolean;
  axis: 'vertical' | 'horizontal' | null;
  consumed: boolean;
  direction: Direction | null;
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

function clamp(top: number) {
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(top, limit));
}

// A vertical page gesture has one scroll owner from its first movement to
// release. Native scrolling cannot be taken over halfway through a swipe.
export function createHeroTouchScroll(options: TouchScrollOptions) {
  let gesture: Gesture | null = null;
  let dragFrame = 0;
  let inertiaFrame = 0;

  const stopFrames = () => {
    cancelAnimationFrame(dragFrame);
    cancelAnimationFrame(inertiaFrame);
    dragFrame = inertiaFrame = 0;
  };
  const cancel = () => {
    stopFrames();
    gesture = null;
  };
  const abandonGesture = () => {
    const consumed = gesture?.consumed;
    cancel();
    if (consumed) options.cancelSnap();
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
  const onStart = (event: TouchEvent) => {
    cancel();
    options.onTouchStart();
    if (event.touches.length !== 1 || event.defaultPrevented || needsNativeTouch(event.target)) return;
    const finger = event.touches[0];
    gesture = {
      identifier: finger.identifier,
      startX: finger.clientX,
      startY: finger.clientY,
      lastY: finger.clientY,
      position: clamp(window.scrollY),
      claimed: false,
      axis: null,
      consumed: false,
      direction: null,
      samples: [{ at: performance.now(), position: clamp(window.scrollY) }],
    };
  };
  const onMove = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 1 || event.defaultPrevented ||
        event.touches[0].identifier !== gesture.identifier) {
      abandonGesture();
      return;
    }
    if (gesture.axis === 'horizontal' && !gesture.claimed) return;
    const finger = event.touches[0];
    const dx = gesture.startX - finger.clientX;
    const dy = gesture.startY - finger.clientY;
    // Leave a clear horizontal swipe native. Reserve smaller movements until
    // intent is clear so initial finger jitter cannot bypass a vertical snap.
    if (!gesture.claimed && Math.abs(dx) > Math.abs(dy) &&
        Math.max(Math.abs(dx), Math.abs(dy)) >= DIRECTION_THRESHOLD) {
      gesture.axis = 'horizontal';
      return;
    }
    if (!event.cancelable) {
      // Never animate against a gesture the browser has already claimed.
      abandonGesture();
      return;
    }
    event.preventDefault();
    gesture.claimed = true;
    // Consume even after the snap has completed while the finger is held.
    if (gesture.consumed) return;
    if (gesture.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD) return;
      gesture.axis = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
    }
    if (gesture.axis !== 'vertical') return;

    const delta = gesture.lastY - finger.clientY;
    gesture.lastY = finger.clientY;
    if (delta === 0) return;
    const { heroTop, projectsTop } = options.getBounds();
    const next = clamp(gesture.position + delta);
    if (projectsTop > heroTop && delta > 0 &&
        gesture.position >= heroTop - 1 && gesture.position < projectsTop - 1) {
      snap(1);
      return;
    }
    if (projectsTop > heroTop && delta < 0 && gesture.position > heroTop + 1 &&
        next <= projectsTop + DOCK_TOLERANCE) {
      // Commit a drag from the list at the dock. Inside the transition,
      // start from the visible position without jumping by the last delta.
      if (gesture.position >= projectsTop) {
        gesture.position = Math.max(next, projectsTop);
        flushDrag();
      }
      snap(-1);
      return;
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
  };
  const onEnd = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 0) {
      abandonGesture();
      return;
    }
    flushDrag();
    const released = gesture;
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

  window.addEventListener('touchstart', onStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onMove, { passive: false, capture: true });
  window.addEventListener('touchend', onEnd, { passive: true, capture: true });
  window.addEventListener('touchcancel', abandonGesture, { passive: true, capture: true });
  return {
    cancel,
    destroy: () => {
      cancel();
      window.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', abandonGesture, { capture: true });
    },
  };
}
