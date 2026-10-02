'use client';

import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useLayoutEffect, type ReactNode } from 'react';
import { revealMaskAnimation } from './text-reveal';

export default function TextRevealMask({ children, active, delay, duration, instant = false, className = '', lineWindow = false }: {
  children: ReactNode;
  active: boolean;
  delay: number;
  duration: number;
  instant?: boolean;
  className?: string;
  lineWindow?: boolean;
}) {
  const bottom = useMotionValue(active && !instant ? 0 : 0.2);
  const clipPath = useTransform(bottom, (allowance) => `inset(-0.15em -0.5em ${lineWindow ? `calc(100% - ${1 + allowance}em)` : `-${allowance}em`} -0.5em)`);
  useLayoutEffect(() => {
    if (!active) return;
    if (instant) {
      bottom.set(0.2);
      return;
    }
    // Tighten before the first visible frame, including repeated openings.
    bottom.set(0);
    const control = animate(bottom, 0.2, revealMaskAnimation(delay, duration).transition);
    return () => control.stop();
  }, [active, bottom, delay, duration, instant]);

  return (
    <motion.span className={`text-reveal-mask inline-block align-bottom ${className}`} style={{ clipPath }}>
      {children}
    </motion.span>
  );
}
