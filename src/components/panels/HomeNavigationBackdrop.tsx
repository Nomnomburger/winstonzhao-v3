'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';

// Overlapping masks gradually reduce the blur toward the bottom of the bar.
// No tint is needed: the navigation inverts against the content underneath.
export default function HomeNavigationBackdrop({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0, 1]);

  return (
    <motion.div
      aria-hidden="true"
      className="home-navigation-backdrop fixed inset-x-0 top-0 z-30 h-[104px] pointer-events-none"
      style={{ opacity }}
    >
      {[16, 8, 4, 2].map((blur, index) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black 0%, black ${18 + index * 14}%, transparent ${48 + index * 16}%)`,
          }}
        />
      ))}
    </motion.div>
  );
}
