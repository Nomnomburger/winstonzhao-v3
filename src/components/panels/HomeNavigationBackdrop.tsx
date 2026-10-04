'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useSyncExternalStore } from 'react';
import { pageScrollY, trackPageScroll } from '@/lib/page-scroll';

const BACKDROP_HEIGHT = 104;
// iOS Safari keeps scrolling the page behind its status bar while every fixed
// element is clipped to the layout viewport below it. Only scrolling content
// can paint there, so on iOS the mobile blur is an absolutely positioned strip
// that follows the scroll offset and reaches well above the viewport: the
// tallest status bar is 62px, and the rest absorbs any lag behind a native
// scroll before the next frame catches up.
const STATUS_BAR_BLEED = 140;

const subscribeToNothing = () => () => {};
// -webkit-touch-callout exists only in iOS WebKit, which every iOS browser uses.
const isIOSWebKit = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none');

// Mobile uses one fading blur to avoid repeatedly filtering the same moving
// backdrop in Safari. Desktop retains its gradual reduction in blur radius.
// Keep the content visible beneath the navigation without adding a tint.
export default function HomeNavigationBackdrop({ progress, mobile = false }: { progress: MotionValue<number>; mobile?: boolean }) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);
  const iosWebKit = useSyncExternalStore(subscribeToNothing, isIOSWebKit, () => false);
  const bleed = mobile && iosWebKit ? STATUS_BAR_BLEED : 0;
  const y = useTransform(pageScrollY, (scrollY) => scrollY - bleed);
  const layers = mobile ? [18] : [16, 8, 4, 2];
  const height = BACKDROP_HEIGHT + bleed;
  // Pixel stops keep the fade below the status bar identical to the plain
  // 104px backdrop: solid through the bleed and the first half, then fading.
  const maskFor = (index: number) => mobile
    ? `linear-gradient(to bottom, black 0px, black ${bleed + BACKDROP_HEIGHT / 2}px, transparent ${height}px)`
    : `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`;

  useEffect(() => {
    if (bleed) trackPageScroll();
  }, [bleed]);

  const blurLayers = layers.map((blur, index) => (
    <div
      key={blur}
      className={`absolute top-0 h-full ${mobile ? 'left-0 w-screen' : 'inset-x-0'}`}
      style={{
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        maskImage: maskFor(index),
        WebkitMaskImage: maskFor(index),
      }}
    />
  ));

  if (bleed) {
    // Positioned from the document's top edge and translated by the scroll
    // offset, the strip stays put on screen without being position: fixed, so
    // WebKit neither clips it to the layout viewport nor samples it as the
    // element that colours Safari's status bar band.
    return (
      <motion.div
        aria-hidden="true"
        className="home-navigation-backdrop pointer-events-none absolute left-0 top-0 z-30 w-0"
        style={{ opacity, y, height }}
      >
        {blurLayers}
      </motion.div>
    );
  }

  return (
    // iOS Safari fills the band behind its status bar from the first fixed
    // element spanning at least 90% of the viewport width at the top edge, and
    // a backdrop-filter there turns that fill solid white. On mobile the fixed
    // box is therefore zero-width, which Safari ignores, while the blur layers
    // inside it still stretch across the viewport.
    <motion.div
      aria-hidden="true"
      className={`home-navigation-backdrop pointer-events-none fixed top-0 z-30 h-[104px] ${mobile ? 'left-0 w-0' : 'inset-x-0'}`}
      style={{ opacity }}
    >
      {blurLayers}
    </motion.div>
  );
}
