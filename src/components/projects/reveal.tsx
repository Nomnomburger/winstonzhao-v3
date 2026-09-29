'use client';

import { motion, useInView, useReducedMotion, type UseInViewOptions } from 'framer-motion';
import { createContext, useContext, useRef, type ReactNode } from 'react';

// Scroll reveals for the work section on the home page. Each piece plays once,
// when it scrolls into view, but not before the page's intro has finished
// (`ready`). They're skipped (everything simply shows) when the page is shown
// without its intro, e.g. coming back to it. With reduced motion, pieces
// still wait for the intro but then appear without moving (`still`).
export const RevealContext = createContext({ ready: true, skip: false });

export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export function useReveal<T extends Element>(
  amount: number | 'some' = 0.2,
  margin?: UseInViewOptions['margin'],
) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount, margin });
  const { ready, skip } = useContext(RevealContext);
  const still = !!useReducedMotion();
  return { ref, shown: skip || (ready && (still || inView)), still };
}

export const revealTransition = (still: boolean, duration: number, delay = 0) =>
  still ? { duration: 0 } : { duration, delay, ease: REVEAL_EASE };

// Hides text that has slid below its line, while letting letters overhang
// sideways and descenders hang below, without taking up any extra space.
export const TEXT_MASK = { clipPath: 'inset(0 -0.5em -0.2em -0.5em)' } as const;

// Where masked text starts, just below its own line
export const TEXT_HIDDEN_Y = '125%';

// A line of text that slides up into view from behind its own bottom edge,
// like the bio lines in the intro.
export function MaskLine({
  shown,
  still,
  delay = 0,
  children,
}: {
  shown: boolean;
  still: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <span className="block" style={TEXT_MASK}>
      <motion.span
        className="block"
        initial={false}
        animate={{ y: shown ? '0%' : TEXT_HIDDEN_Y }}
        transition={revealTransition(still, 0.9, delay)}
      >
        {children}
      </motion.span>
    </span>
  );
}
