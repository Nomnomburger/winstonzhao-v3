'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';

// Mobile uses one fading blur to avoid repeatedly filtering the same moving
// backdrop in Safari. Desktop retains its gradual reduction in blur radius.
// Keep the content visible beneath the navigation without adding a tint.
export default function HomeNavigationBackdrop({ progress, mobile = false }: { progress: MotionValue<number>; mobile?: boolean }) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);
  const layers = mobile ? [18] : [16, 8, 4, 2];

  return (
    <motion.div
      aria-hidden="true"
      className="home-navigation-backdrop fixed inset-x-0 top-0 z-30 h-[104px] pointer-events-none"
      style={{ opacity }}
    >
      {layers.map((blur, index) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: mobile
              ? 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
              : `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`,
            WebkitMaskImage: mobile
              ? 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
              : `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`,
          }}
        />
      ))}
    </motion.div>
  );
}
