import { getSmoothScroll, scrollInstantly } from '@/lib/smooth-scroll';

// Shared by the home page's hero snap and the project page's case study snap,
// so both pages move with the same timing and read the wheel the same way.

export type SnapDirection = -1 | 1;
export const DOCK_TOLERANCE = 48;
export const UPWARD_INTENT_MS = 1500;
export const WHEEL_GESTURE_IDLE_MS = 180;
const WHEEL_MOMENTUM_DECAY_EVENTS = 3;
const WHEEL_MOMENTUM_DECAY_RATIO = 0.8;

// Down to the next section, and the slightly longer return.
export const SNAP_DURATION: Record<SnapDirection, number> = { 1: 0.8, [-1]: 1.1 };
export const SNAP_EASE = [0.2, 0.8, 0.2, 1] as const;

export interface WheelGesture {
  direction: SnapDirection;
  lastEventAt: number;
  lastDelta: number;
  previousDelta: number;
  decayStartDelta: number;
  decayingEvents: number;
  momentum: boolean;
  consumed: boolean;
}

export function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    !!target.closest('input, textarea, select, [role="textbox"]')
  );
}

export function isKeyboardControl(target: EventTarget | null) {
  return isEditable(target) || (target instanceof HTMLElement && !!target.closest(
    'a[href], button, summary, [role="button"], [role="slider"], [role="listbox"], [role="menu"]',
  ));
}

// The wheel event's vertical distance in pixels.
export function wheelDistance(event: WheelEvent) {
  const smoothScroll = getSmoothScroll();
  return Math.abs(event.deltaY) * (
    event.deltaMode === 1 ? (smoothScroll ? 100 / 6 : 16) :
      event.deltaMode === 2 ? window.innerHeight : 1
  );
}

// Adds a wheel event to the current gesture, or starts a new one after a
// pause, a reversal or a renewed push. Returns the gesture it belongs to.
export function trackWheelGesture(
  current: WheelGesture | null,
  direction: SnapDirection,
  delta: number,
  now: number,
  snapping: boolean,
): WheelGesture {
  let gesture = current;
  const recentPeak = gesture ? Math.max(gesture.lastDelta, gesture.previousDelta) : 0;
  // A fresh push accelerates again, unlike the fading momentum from the
  // snap. Accept a clear increase immediately, or a gentler two-event ramp.
  const renewedPush = (gesture?.consumed || gesture?.momentum) && !snapping && (
    (delta > recentPeak * 1.25 && delta - recentPeak >= 3) ||
    (delta >= 6 && gesture.lastDelta > gesture.previousDelta && delta > gesture.lastDelta &&
      delta > gesture.previousDelta * 1.25 && delta - gesture.previousDelta >= 2)
  );
  if (!gesture || gesture.direction !== direction ||
      now - gesture.lastEventAt >= WHEEL_GESTURE_IDLE_MS || renewedPush) {
    if (gesture?.consumed && gesture.momentum && !snapping &&
        getSmoothScroll()?.isScrolling === 'smooth') {
      // A fresh gesture takes over from the visible position, so reversing
      // cannot keep drifting toward the old snap destination.
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
  return gesture;
}
