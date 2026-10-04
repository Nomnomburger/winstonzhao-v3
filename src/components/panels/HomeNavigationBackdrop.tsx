'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useSyncExternalStore } from 'react';

const BACKDROP_HEIGHT = 104;
// iOS Safari keeps scrolling the page behind its status bar while the layout
// viewport, and every fixed element in it, starts below the bar. The mobile
// blur bleeds upward by more than the tallest status bar to cover that band.
const STATUS_BAR_BLEED = 80;

const subscribeToNothing = () => () => {};
// -webkit-touch-callout exists only in iOS WebKit, which every iOS browser uses.
const isIOSWebKit = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none');

// Mobile uses one fading blur to avoid repeatedly filtering the same moving
// backdrop in Safari. Desktop retains its gradual reduction in blur radius.
// Keep the content visible beneath the navigation without adding a tint.
export default function HomeNavigationBackdrop({ progress, mobile = false }: { progress: MotionValue<number>; mobile?: boolean }) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);
  const iosWebKit = useSyncExternalStore(subscribeToNothing, isIOSWebKit, () => false);
  const layers = mobile ? [18] : [16, 8, 4, 2];
  const bleed = mobile && iosWebKit ? STATUS_BAR_BLEED : 0;
  const height = BACKDROP_HEIGHT + bleed;
  // Pixel stops keep the fade below the status bar identical to the original
  // 104px backdrop: solid through the bleed and the first half, then fading.
  const maskFor = (index: number) => mobile
    ? `linear-gradient(to bottom, black 0px, black ${bleed + BACKDROP_HEIGHT / 2}px, transparent ${height}px)`
    : `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`;

  const backdrop = (
    <motion.div
      aria-hidden="true"
      className={`home-navigation-backdrop pointer-events-none fixed inset-x-0 z-30${bleed ? ' home-navigation-backdrop-bleed' : ''}`}
      style={{ opacity, top: -bleed, height }}
    >
      {layers.map((blur, index) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: maskFor(index),
            WebkitMaskImage: maskFor(index),
          }}
        />
      ))}
    </motion.div>
  );
  if (!bleed) return backdrop;

  // WebKit clips a fixed layer to the layout viewport only while its
  // compositing ancestor is the root layer. A composited wrapper lifts that
  // clip, and will-change: opacity never becomes a containing block, so the
  // child stays fixed; the identity transform in globals.css lifts WebKit's
  // separate composited-bounds clamp. Chromium would treat this wrapper as a
  // backdrop root and stop blurring, so it only exists on iOS WebKit.
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-30 h-0 w-0" style={{ willChange: 'opacity' }}>
      {backdrop}
    </div>
  );
}
