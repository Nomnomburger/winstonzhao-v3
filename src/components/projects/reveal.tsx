'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { createContext, useContext, useRef, type ReactNode } from 'react';

// Scroll reveals for the work section on the home page. Each piece plays once,
// when it scrolls into view, but not before the page's intro has finished
// (`ready`). They're skipped (everything simply shows) when the page is shown
// without its intro, e.g. coming back to it, or when the visitor prefers
// reduced motion.
export const RevealContext = createContext({ ready: true, skip: false });

export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export function useReveal<T extends Element>(amount = 0.2) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount });
  const { ready, skip } = useContext(RevealContext);
  const reducedMotion = useReducedMotion();
  return { ref, shown: skip || !!reducedMotion || (ready && inView) };
}

// A line of text that slides up into view from behind its own bottom edge,
// like the bio lines in the intro. The mask is a touch taller than the line
// so descenders aren't clipped once it's in place.
export function MaskLine({
  shown,
  delay = 0,
  className = '',
  children,
}: {
  shown: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="block overflow-hidden pb-[0.15em] -mb-[0.15em]">
      <motion.span
        className={`block ${className}`}
        initial={false}
        animate={{ y: shown ? '0%' : '115%' }}
        transition={{ duration: 0.9, delay, ease: REVEAL_EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}
