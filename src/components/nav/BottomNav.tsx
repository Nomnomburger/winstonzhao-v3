'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

type RouteName = 'home' | 'projects' | 'playground' | 'about' | 'contact';

interface BottomNavProps {
  activeRoute: RouteName;
  onNavigate: (route: RouteName) => void;
}

const NAV_ITEMS: { route: RouteName; label: string }[] = [
  { route: 'home', label: 'start' },
  { route: 'projects', label: 'projects' },
  { route: 'playground', label: 'playground' },
  { route: 'about', label: 'about' },
  { route: 'contact', label: 'contact' },
];

// Spring configuration similar to Figma
const springTransition = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 55,
  mass: 0.6,
};

export default function BottomNav({ activeRoute, onNavigate }: BottomNavProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [labelWidths, setLabelWidths] = useState<number[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const measureContainerRef = useRef<HTMLDivElement>(null);

  // Measure label widths on mount
  useLayoutEffect(() => {
    // Create hidden measurement container
    const measureContainer = document.createElement('div');
    measureContainer.style.position = 'absolute';
    measureContainer.style.visibility = 'hidden';
    measureContainer.style.pointerEvents = 'none';
    measureContainer.style.whiteSpace = 'nowrap';
    measureContainer.style.fontSize = '16px';
    measureContainer.style.fontFamily = 'var(--font-pp-neue-montreal), Arial, Helvetica, sans-serif';
    measureContainer.style.letterSpacing = '-0.32px';
    document.body.appendChild(measureContainer);

    const widths = NAV_ITEMS.map((item) => {
      measureContainer.textContent = item.label;
      return measureContainer.offsetWidth;
    });

    document.body.removeChild(measureContainer);
    setLabelWidths(widths);
  }, []);

  // Clean up any pending hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Calculate offset to center on playground (index 2) when expanded
  // offset = (rightSideWidth - leftSideWidth) / 2
  const leftSideWidth = (labelWidths[0] || 0) + (labelWidths[1] || 0);
  const rightSideWidth = (labelWidths[3] || 0) + (labelWidths[4] || 0);
  const centerOffset = (rightSideWidth - leftSideWidth) / 2;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-[36px]"
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(false);
          hoverTimeoutRef.current = null;
        }, 500);
      }}
      aria-label="Main navigation"
    >
      <LayoutGroup>
        <motion.ul
          className="flex items-end justify-center list-none m-0 p-0"
          style={{ height: 36 }}
          initial={{ gap: '10px', x: 0 }}
          animate={{ 
            gap: isHovered ? '48px' : '10px',
            x: isHovered ? centerOffset : 0,
          }}
          transition={springTransition}
          layout
        >
          {NAV_ITEMS.map((item, index) => {
            const isActive = activeRoute === item.route;
            const labelWidth = labelWidths[index] || 0;

            // Bar heights: collapsed active=36, inactive=16; expanded active=15, inactive=3
            const barHeight = isHovered
              ? isActive ? 15 : 3
              : isActive ? 36 : 16;

            // Bar bottom position: collapsed=0, expanded=22 (above text)
            const barBottom = isHovered ? 22 : 0;

            return (
              <motion.li
                key={item.route}
                className="relative flex flex-col items-center justify-end"
                style={{ height: 36 }}
                layout
                transition={springTransition}
              >
                <motion.button
                  onClick={() => onNavigate(item.route)}
                  className="flex flex-col items-center justify-end relative bg-transparent border-none cursor-pointer p-0"
                  style={{ height: 36 }}
                  aria-current={isActive ? 'page' : undefined}
                  layout
                  transition={springTransition}
                >
                  {/* Bar - isolated from layout, animated with spring */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bottom: 0,
                      width: 2,
                      height: 36,
                    }}
                  >
                    <motion.div
                      className="bg-[#1E1E1E] dark:bg-white"
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: 2,
                        minWidth: 2,
                        maxWidth: 2,
                      }}
                      animate={{
                        height: barHeight,
                        bottom: barBottom,
                      }}
                      transition={springTransition}
                    />
                  </div>

                  {/* Label - always mounted, animates width from center */}
                  <motion.span
                    ref={(el) => { labelRefs.current[index] = el; }}
                    className="overflow-hidden inline-flex justify-center"
                    style={{
                      width: 0, // start collapsed
                    }}
                    animate={{
                      width: isHovered ? labelWidth : 0,
                      opacity: isHovered ? 1 : 0,
                    }}
                    transition={{
                      width: {
                        duration: 0.15,
                        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for quick, subtle reveal
                      },
                      opacity: {
                        duration: isHovered ? 0.3 : 0.15,
                        ease: 'easeOut',
                        delay: isHovered ? 0.05 : 0,
                      },
                    }}
                    initial={false}
                  >
                    <span
                      className={`text-[16px] leading-normal tracking-[-0.32px] whitespace-nowrap ${
                        isActive ? 'text-[#1E1E1E] dark:text-white' : 'text-[#1E1E1E]/85 dark:text-white/85'
                      }`}
                      style={{
                        fontFamily: 'var(--font-pp-neue-montreal), Arial, Helvetica, sans-serif',
                        fontWeight: 400,
                      }}
                    >
                      {item.label}
                    </span>
                  </motion.span>
                </motion.button>
              </motion.li>
            );
          })}
        </motion.ul>
      </LayoutGroup>
    </nav>
  );
}
