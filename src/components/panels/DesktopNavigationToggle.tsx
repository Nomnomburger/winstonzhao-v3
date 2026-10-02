'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useSyncExternalStore, type RefObject } from 'react';

type Props = {
  progress: MotionValue<number>;
  menuProgress: MotionValue<number>;
  heroTop: number | MotionValue<number>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  navigationId: string;
  onClick: () => void;
  instant: boolean;
  delay: number;
  embedded?: boolean;
};

export default function DesktopNavigationToggle({ progress, menuProgress, heroTop, triggerRef, open, navigationId, onClick, instant, delay, embedded = false }: Props) {
  const reducedMotion = useReducedMotion();
  const rotation = useMotionValue(0);
  const atHero = useSyncExternalStore(
    (listener) => progress.on('change', listener),
    () => progress.get() < 0.01,
    () => true,
  );
  const y = useTransform(() => ((typeof heroTop === 'number' ? heroTop : heroTop.get()) - 36) * (1 - progress.get()) * (1 - menuProgress.get()));
  const color = useTransform(() => !open && progress.get() >= 0.7 ? '#ffffff' : 'var(--foreground)');
  const blend = useTransform(() => !open && progress.get() >= 0.7 ? 'difference' : 'normal');
  const line1Y = useTransform(() => (18 - 7 * progress.get()) * (1 - menuProgress.get()) + 18 * menuProgress.get());
  const line2X1 = useTransform(() => 18 * (1 - progress.get()) * (1 - menuProgress.get()));
  const line2X2 = useTransform(() => 18 + 18 * (progress.get() + (1 - progress.get()) * menuProgress.get()));
  const line2Y1 = useTransform(() => 25 * progress.get() * (1 - menuProgress.get()) + 18 * menuProgress.get());
  const line2Y2 = useTransform(() => (36 - 11 * progress.get()) * (1 - menuProgress.get()) + 18 * menuProgress.get());
  const line1Rotate = useTransform(menuProgress, [0, 1], [0, 45]);
  const line2Rotate = useTransform(menuProgress, [0, 1], [0, -45]);

  useEffect(() => {
    if (atHero && !open && !reducedMotion) {
      const start = Math.ceil(rotation.get() / 360) * 360;
      const spin = animate(rotation, [start, start, start + 360], {
        duration: 6, times: [0, 0.5, 1], ease: [0.85, 0, 0.15, 1], repeat: Infinity,
      });
      return () => spin.stop();
    }
    const settle = animate(rotation, Math.ceil(rotation.get() / 360) * 360, {
      duration: reducedMotion ? 0 : 0.55, ease: [0.4, 0, 0.2, 1],
    });
    return () => settle.stop();
  }, [atHero, open, reducedMotion, rotation]);

  return (
    <motion.button
      ref={triggerRef}
      type="button"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls={navigationId}
      onClick={onClick}
      className={`${embedded ? 'relative block' : 'fixed right-9 top-9 z-[60]'} h-9 w-9 cursor-pointer`}
      style={{ y, color, mixBlendMode: embedded ? 'normal' : blend }}
      initial={instant || reducedMotion ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.8, delay: instant ? 0 : delay, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.svg aria-hidden="true" width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ rotate: rotation, overflow: 'visible' }}>
        <motion.line x1="0" x2="36" y1={line1Y} y2={line1Y} stroke="currentColor" strokeWidth="2" style={{ rotate: line1Rotate, transformOrigin: '18px 18px' }} />
        <motion.line x1={line2X1} x2={line2X2} y1={line2Y1} y2={line2Y2} stroke="currentColor" strokeWidth="2" style={{ rotate: line2Rotate, transformOrigin: '18px 18px' }} />
      </motion.svg>
    </motion.button>
  );
}
