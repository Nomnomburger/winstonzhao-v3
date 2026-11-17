'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { getSmoothScroll } from '@/lib/smooth-scroll';
import { REVEAL_EASE, TEXT_HIDDEN_Y } from '@/components/projects/reveal';

// Project page reveals. A RevealArea is one block of the page (the title, a
// section): it plays once, as a whole, when the block reaches the screen, or
// straight after load for the top of the page (`immediate`). The pieces inside
// read its state, so a block's text and media move together instead of each
// waiting for itself to scroll into view.
//   RevealText:  slides up from behind its own bottom edge, like the home page
//                text (titles, headings, short lines).
//   RevealFade:  a quick, small fade and lift for body text and media.
//   RevealMedia: the home page image reveal, opening from the bottom.
// With reduced motion, everything simply shows. Every moving part carries
// data-reveal, so print shows it in its final state (see globals.css).

interface RevealState {
  shown: boolean;
  still: boolean;
}

const RevealContext = createContext<RevealState>({ shown: true, still: true });

type AreaTag = 'div' | 'section' | 'header' | 'dl';

export function RevealArea({
  as = 'div',
  immediate = false,
  className,
  id,
  tabIndex,
  children,
}: {
  as?: AreaTag;
  immediate?: boolean;
  className?: string;
  id?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  // Long sections are taller than the screen, so 'some' (any pixel) with the
  // bottom tenth of the screen excluded: the block plays as it comes up.
  const inView = useInView(ref, { once: true, amount: 'some', margin: '0px 0px -10% 0px' });
  const still = !!useReducedMotion();
  // `immediate` waits one frame after mount so the hidden state paints first.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!immediate) return;
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [immediate]);
  const shown = still || (immediate ? mounted : inView);
  const Tag = as as 'div';
  return (
    <RevealContext.Provider value={{ shown, still }}>
      <Tag ref={ref as RefObject<HTMLDivElement>} id={id} tabIndex={tabIndex} className={className}>
        {children}
      </Tag>
    </RevealContext.Provider>
  );
}

// The home page's line mask, with room above the line too: hidden text waits
// below, so the extra room shows nothing then, and afterwards a link's focus
// ring isn't cut off at the top.
const TEXT_MASK = { clipPath: 'inset(-0.25em -0.5em -0.2em -0.5em)' };

const transition = (still: boolean, shown: boolean, duration: number, delay: number) =>
  still ? { duration: 0 } : { duration, delay: shown ? delay : 0, ease: REVEAL_EASE };

export function RevealText({
  delay = 0,
  className = '',
  style,
  children,
}: {
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { shown, still } = useContext(RevealContext);
  return (
    <span data-reveal className={`block ${className}`} style={{ ...TEXT_MASK, ...style }}>
      <motion.span
        data-reveal
        className="block"
        initial={false}
        animate={{ y: shown ? '0%' : TEXT_HIDDEN_Y }}
        transition={transition(still, shown, 0.9, delay)}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function RevealFade({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const { shown, still } = useContext(RevealContext);
  return (
    <motion.div
      data-reveal
      className={className}
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 16 }}
      transition={transition(still, shown, 0.6, delay)}
    >
      {children}
    </motion.div>
  );
}

// "Read ↓": shown in place of the visit link when a project has none. Scrolls
// to the case study the same way the section menu does.
export function ReadLink({ target }: { target: string }) {
  return (
    <a
      href={`#${target}`}
      onClick={(e) => {
        const el = document.getElementById(target);
        if (!el) return;
        e.preventDefault();
        const smoothScroll = getSmoothScroll();
        if (smoothScroll) smoothScroll.scrollTo(el);
        else el.scrollIntoView({ behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }}
      className="hover:underline"
    >
      Read ↓
    </a>
  );
}

export function RevealMedia({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const { shown, still } = useContext(RevealContext);
  // The clip only holds while the reveal plays. Once the image has settled it
  // comes off, so the focus ring around the image isn't cut off.
  const [done, setDone] = useState(false);
  return (
    <motion.div
      data-reveal
      className={done || still ? '[clip-path:none]!' : 'overflow-hidden'}
      initial={false}
      animate={{ clipPath: shown ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)' }}
      transition={transition(still, shown, 1.1, delay)}
    >
      <motion.div
        data-reveal
        initial={false}
        animate={{ scale: shown ? 1 : 1.08 }}
        transition={transition(still, shown, 1.4, delay)}
        onAnimationComplete={() => {
          if (shown) setDone(true);
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
