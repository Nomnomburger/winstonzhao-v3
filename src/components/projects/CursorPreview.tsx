'use client';

import { motion, useMotionValue, useSpring, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { REVEAL_EASE } from './reveal';

// An image that pops up beside the cursor while something is hovered and
// trails it on a spring, so it lags a little behind. Used by the project list
// and by the name and bio words at the top of the home page. It sits just to
// the right of the pointer (or to the left near the window's right edge).
const CURSOR_GAP = 24;
// Closest the image gets to the window's edges
const EDGE_MARGIN = 16;
const FOLLOW_SPRING = { stiffness: 350, damping: 35, mass: 0.6 } as const;
const REVEAL_TRANSITION = { duration: 0.25, ease: REVEAL_EASE };

interface PreviewSize {
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
function useCanHover() {
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
  // What's showing right now, and when the last one was let go (it stays on
  // screen while it fades out)
  const activeRef = useRef<string | null>(null);
  const hiddenAt = useRef(-Infinity);

  const place = (clientX: number, clientY: number, jump: boolean) => {
    const { width, height } = sizeRef.current;
    const flip = clientX + CURSOR_GAP + width > window.innerWidth - EDGE_MARGIN;
    // Kept fully on screen: beside the cursor where it fits, and centred on
    // it vertically, but never past the window's edges
    const nextX = Math.max(
      EDGE_MARGIN,
      Math.min(flip ? clientX - CURSOR_GAP - width : clientX + CURSOR_GAP, window.innerWidth - width - EDGE_MARGIN),
    );
    const nextY = Math.max(
      EDGE_MARGIN,
      Math.min(clientY - height / 2, window.innerHeight - height - EDGE_MARGIN),
    );
    targetX.set(nextX);
    targetY.set(nextY);
    if (jump) {
      x.jump(nextX);
      y.jump(nextY);
    }
  };

  return {
    active,
    x,
    y,
    size,
    show: (key, e, nextSize) => {
      // A preview that appears from hidden starts right at the cursor at its
      // own size; one that's still on screen (showing, or fading out after
      // the pointer moved straight from one word to the next) glides there.
      const onScreen =
        activeRef.current !== null || performance.now() - hiddenAt.current < REVEAL_TRANSITION.duration * 1000;
      sizeRef.current = nextSize;
      setSize({ ...nextSize, jump: !onScreen });
      place(e.clientX, e.clientY, !onScreen);
      activeRef.current = key;
      setActive(key);
    },
    move: (e) => {
      if (activeRef.current) place(e.clientX, e.clientY, false);
    },
    hide: () => {
      if (activeRef.current) hiddenAt.current = performance.now();
      activeRef.current = null;
      setActive(null);
    },
  };
}

interface CursorPreviewProps {
  preview: CursorPreviewState;
  zIndex?: number;
  // Every image stays mounted (hidden) so they're loaded before the first
  // hover and swap instantly.
  images: { key: string; content: ReactNode }[];
}

// The preview itself: it fades in while growing from 92% (and shrinks away
// the same way), taking each image's size as the hover moves between them.
// Portalled to <body> so no transformed ancestor (entrance animations) can
// offset its fixed position.
export default function CursorPreview({ preview, images, zIndex = 40 }: CursorPreviewProps) {
  const canHover = useCanHover();
  // The last image shown stays visible while the preview fades away
  const [shown, setShown] = useState(preview.active);
  if (preview.active && preview.active !== shown) setShown(preview.active);

  if (!canHover) return null;
  return createPortal(
    <motion.div
      className="fixed top-0 left-0 pointer-events-none"
      style={{ x: preview.x, y: preview.y, zIndex }}
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
