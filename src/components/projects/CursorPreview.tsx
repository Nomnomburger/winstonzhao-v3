'use client';

import { motion, useMotionValue, useSpring, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// An image that pops up beside the cursor while something is hovered and
// trails it on a spring, so it lags a little behind. Used by the project list
// and by the name and bio words at the top of the home page. It sits just to
// the right of the pointer (or to the left near the window's right edge).
const CURSOR_GAP = 24;
// Closest the image gets to the window's edges
const EDGE_MARGIN = 16;
const FOLLOW_SPRING = { stiffness: 350, damping: 35, mass: 0.6 } as const;
const REVEAL_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

export interface PreviewSize {
  width: number;
  height: number;
}

interface ShownSize extends PreviewSize {
  // Set when the preview appears from hidden, so it opens at the new size
  // instead of resizing from the last one
  jump: boolean;
}

export interface CursorPreviewState {
  active: string | null;
  x: MotionValue<number>;
  y: MotionValue<number>;
  size: ShownSize;
  // Shows the image for `key` at the pointer, at the given size
  show: (key: string, e: React.MouseEvent, size: PreviewSize) => void;
  // Follows the pointer while an image is showing
  move: (e: React.MouseEvent) => void;
  hide: () => void;
}

// True on devices with a mouse or trackpad (no previews on touch screens)
export function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return canHover;
}

export function useCursorPreview(): CursorPreviewState {
  const [active, setActive] = useState<string | null>(null);
  const [size, setSize] = useState<ShownSize>({ width: 0, height: 0, jump: true });
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, FOLLOW_SPRING);
  const y = useSpring(targetY, FOLLOW_SPRING);
  const sizeRef = useRef<PreviewSize>(size);
  const placed = useRef(false);

  const place = (clientX: number, clientY: number) => {
    const { width, height } = sizeRef.current;
    const flip = clientX + CURSOR_GAP + width > window.innerWidth - EDGE_MARGIN;
    const nextX = flip ? clientX - CURSOR_GAP - width : clientX + CURSOR_GAP;
    // Centred on the cursor, but kept fully on screen near the top or bottom
    const nextY = Math.max(
      EDGE_MARGIN,
      Math.min(clientY - height / 2, window.innerHeight - height - EDGE_MARGIN),
    );
    targetX.set(nextX);
    targetY.set(nextY);
    // On the first hover, start at the cursor instead of gliding in from 0,0
    if (!placed.current) {
      x.jump(nextX);
      y.jump(nextY);
      placed.current = true;
    }
  };

  return {
    active,
    x,
    y,
    size,
    show: (key, e, nextSize) => {
      sizeRef.current = nextSize;
      setSize({ ...nextSize, jump: active === null });
      place(e.clientX, e.clientY);
      setActive(key);
    },
    move: (e) => {
      if (placed.current) place(e.clientX, e.clientY);
    },
    hide: () => {
      setActive(null);
      placed.current = false;
    },
  };
}

interface CursorPreviewProps {
  preview: CursorPreviewState;
  // Every image stays mounted (hidden) so they're loaded before the first
  // hover and swap instantly.
  images: { key: string; content: ReactNode }[];
}

// The preview itself: it fades in while growing from 92% (and shrinks away
// the same way), taking each image's size as the hover moves between them.
// Portalled to <body> so no transformed ancestor (entrance animations) can
// offset its fixed position.
export default function CursorPreview({ preview, images }: CursorPreviewProps) {
  const canHover = useCanHover();
  // The last image shown stays visible while the preview fades away
  const [shown, setShown] = useState(preview.active);
  if (preview.active && preview.active !== shown) setShown(preview.active);

  if (!canHover) return null;
  return createPortal(
    <motion.div
      className="fixed top-0 left-0 z-40 pointer-events-none"
      style={{ x: preview.x, y: preview.y }}
      aria-hidden="true"
    >
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{
          opacity: preview.active ? 1 : 0,
          scale: preview.active ? 1 : 0.92,
          width: preview.size.width,
          height: preview.size.height,
        }}
        transition={{
          ...REVEAL_TRANSITION,
          width: preview.size.jump ? { duration: 0 } : REVEAL_TRANSITION,
          height: preview.size.jump ? { duration: 0 } : REVEAL_TRANSITION,
        }}
      >
        {images.map(({ key, content }) => (
          <div
            key={key}
            className="absolute inset-0 [&>*]:w-full [&>*]:h-full [&>*]:object-cover"
            style={{ opacity: key === shown ? 1 : 0 }}
          >
            {content}
          </div>
        ))}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
