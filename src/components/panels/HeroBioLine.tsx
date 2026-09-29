'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { createContext, type ReactNode } from 'react';

// Bio exit tuning — shared by desktop and mobile.
// Lower = tighter word stagger; higher = more separation between words.
// Fraction of exit progress, not seconds. Keep between 0 and 0.68.
const BIO_EXIT_STAGGER = 0.44;

interface HeroBioExit {
  progress: MotionValue<number>;
  wordOffset: number;
  wordCount: number;
}

export const HeroBioExitContext = createContext<HeroBioExit | null>(null);

interface HeroBioLineProps {
  children: ReactNode;
  progress: MotionValue<number>;
  index: number;
  lines: readonly string[];
}

// Spread the word stagger through the snap: its scroll easing otherwise
// compresses the first several words into almost the same frame.
export default function HeroBioLine({ children, progress, index, lines }: HeroBioLineProps) {
  const exitProgress = useTransform(progress,
    [0, 0.2, 0.45, 0.65, 0.8, 0.9, 1],
    [0, 0.08, 0.2, 0.35, 0.5, 0.65, 1],
  );
  const wordCounts = lines.map((line) => line.trim().split(/\s+/).length);
  const wordOffset = wordCounts.slice(0, index).reduce((sum, count) => sum + count, 0);
  const wordCount = wordCounts.reduce((sum, count) => sum + count, 0);

  return (
    <HeroBioExitContext.Provider value={{ progress: exitProgress, wordOffset, wordCount }}>
      <p>{children}</p>
    </HeroBioExitContext.Provider>
  );
}

// An independent mask per word mirrors the entrance reveal. The last words
// leave first, clearing the lower lines before project images reach them.
export function HeroBioExitWord({ children, progress, order, wordCount }: {
  children: ReactNode;
  progress: MotionValue<number>;
  order: number;
  wordCount: number;
}) {
  const start = (wordCount - 1 - order) / Math.max(1, wordCount - 1) * BIO_EXIT_STAGGER;
  const phase = useTransform(progress, [start, start + 0.32], [0, 1]);
  const y = useTransform(phase, (value) => `${-110 * value * value * (3 - 2 * value)}%`);
  const opacity = useTransform(phase, [0, 0.45, 1], [1, 1, 0]);
  const clipPath = useTransform(phase, [0, 0.05, 1], [
    'inset(-10% -10% -20% -10%)',
    'inset(0% -10% -20% -10%)',
    'inset(0% -10% -20% -10%)',
  ]);

  return (
    <motion.span className="inline-block align-bottom" style={{ clipPath }}>
      <motion.span className="inline-block align-bottom" style={{ y, opacity }}>
        {children}
      </motion.span>
    </motion.span>
  );
}
