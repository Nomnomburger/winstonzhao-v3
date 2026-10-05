'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useSyncExternalStore } from 'react';

const BACKDROP_HEIGHT = 104;
// Four stacked blurs, strongest at the top, each masked to fade out a little
// further down the band than the last, so the blur softens progressively.
const LAYERS = [16, 8, 4, 2].map((blur, index) => ({ blur, solid: 18 + index * 14, clear: 48 + index * 16 }));
// iOS Safari keeps scrolling the page behind its status bar while fixed
// elements start below it. On iOS the blur reaches this far above the
// viewport (the tallest status bar is 62px); globals.css lifts WebKit's clips.
const STATUS_BAR_BLEED = 80;

const subscribeToNothing = () => () => {};
// -webkit-touch-callout exists only in iOS WebKit, which every iOS browser uses.
const isIOSWebKit = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none');

// Keep the content visible beneath the navigation without adding a tint.
export default function HomeNavigationBackdrop({ progress, mobile = false }: { progress: MotionValue<number>; mobile?: boolean }) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);
  const iosWebKit = useSyncExternalStore(subscribeToNothing, isIOSWebKit, () => false);
  const bleed = mobile && iosWebKit ? STATUS_BAR_BLEED : 0;
  const height = BACKDROP_HEIGHT + bleed;
  // With a bleed the stops are pixel-anchored so the fade below the status
  // bar keeps the same shape it has without one.
  const maskFor = ({ solid, clear }: { solid: number; clear: number }) => bleed
    ? `linear-gradient(to bottom, black 0px, black ${bleed + BACKDROP_HEIGHT * solid / 100}px, transparent ${bleed + BACKDROP_HEIGHT * clear / 100}px)`
    : `linear-gradient(to bottom, black 0%, black ${solid}%, transparent ${clear}%)`;

  const backdrop = (
    // iOS Safari fills the band behind its status bar from the first fixed
    // element spanning at least 90% of the viewport width at the top edge, and
    // a backdrop-filter there turns that fill solid white. On mobile the fixed
    // box is therefore zero-width, which Safari ignores, while the blur layers
    // inside it still stretch across the viewport.
    <motion.div
      aria-hidden="true"
      className={`home-navigation-backdrop pointer-events-none fixed z-30 ${mobile ? 'left-0 w-0' : 'inset-x-0'}${bleed ? ' home-navigation-backdrop-bleed' : ''}`}
      style={{ opacity, top: -bleed, height }}
    >
      {LAYERS.map((layer) => (
        <div
          key={layer.blur}
          className={`absolute top-0 h-full ${mobile ? 'left-0 w-screen' : 'inset-x-0'}`}
          style={{
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            maskImage: maskFor(layer),
            WebkitMaskImage: maskFor(layer),
          }}
        />
      ))}
    </motion.div>
  );
  if (!bleed) return backdrop;

  // WebKit clips a fixed layer to the layout viewport only while its
  // compositing ancestor is the root layer. This wrapper is composited by a
  // no-op opacity animation (globals.css), which, unlike will-change or a
  // transform, makes it neither a backdrop root (that would blank the blur)
  // nor a containing block (that would stop the child being fixed).
  return (
    <div className="navigation-composited pointer-events-none absolute left-0 top-0 z-30 h-0 w-0">
      {backdrop}
    </div>
  );
}
