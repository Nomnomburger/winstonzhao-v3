'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { RefObject } from 'react';

type Props = {
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  closing: boolean;
  navigationId: string;
  onClick: () => void;
};

export default function MobileNavigationToggle({ triggerRef, open, closing, navigationId, onClick }: Props) {
  const reducedMotion = useReducedMotion();
  const expanded = open && !closing;
  const transition = { duration: reducedMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={navigationId}
      aria-haspopup="dialog"
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="pointer-events-auto relative block h-[17px] w-[18px] cursor-pointer"
    >
      <motion.span
        aria-hidden="true"
        className="absolute left-0 top-[5px] h-px w-full bg-current"
        animate={expanded ? { y: 3, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={transition}
      />
      <motion.span
        aria-hidden="true"
        className="absolute left-0 top-[11px] h-px w-full bg-current"
        animate={expanded ? { y: -3, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={transition}
      />
    </button>
  );
}
