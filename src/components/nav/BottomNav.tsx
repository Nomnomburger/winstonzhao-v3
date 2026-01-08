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
  const [mouseX, setMouseX] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [labelWidths, setLabelWidths] = useState<number[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredTab, setHoveredTab] = useState<RouteName | null>(null);
  const [pressedTab, setPressedTab] = useState<RouteName | null>(null);

  // Track mouse position when hovering
  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX);
  };

  // Check if mouse is near left edge (within 15% of viewport)
  const isNearLeftEdge = mouseX !== null && mouseX < window.innerWidth * 0.15;
  // Check if mouse is near right edge (within 15% of viewport)
  const isNearRightEdge = mouseX !== null && mouseX > window.innerWidth * 0.85;

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

  // Get current page index for arrow navigation
  const currentIndex = NAV_ITEMS.findIndex((item) => item.route === activeRoute);
  const hasPrevPage = currentIndex > 0;
  const hasNextPage = currentIndex < NAV_ITEMS.length - 1;

  const goToPrevPage = () => {
    if (hasPrevPage) {
      onNavigate(NAV_ITEMS[currentIndex - 1].route);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      onNavigate(NAV_ITEMS[currentIndex + 1].route);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-[24px]"
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
          setMouseX(null);
          hoverTimeoutRef.current = null;
        }, 500);
      }}
      onMouseMove={handleMouseMove}
      aria-label="Main navigation"
    >
      {/* Progressive blur backdrop with gradient - only show on non-home pages */}
      <AnimatePresence>
        {activeRoute !== 'home' && (
          <>
            <motion.div
              key="blur-backdrop"
              className="absolute pointer-events-none"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                height: '200px',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,1) 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,1) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
            {/* Gradient overlay - light mode only */}
            <motion.div
              key="gradient-overlay"
              className="absolute pointer-events-none dark:hidden"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                height: '200px',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.6) 70%, rgba(255,255,255,0.8) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
            {/* Dark mode gradient overlay */}
            <motion.div
              key="dark-gradient-overlay"
              className="absolute pointer-events-none dark:block hidden"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                height: '200px',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(30,30,30,0.3) 40%, rgba(30,30,30,0.6) 70%, rgba(30,30,30,0.8) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </>
        )}
      </AnimatePresence>
      {/* Left Arrow - Fixed to bottom left corner */}
      <motion.button
        onClick={goToPrevPage}
        className="relative bg-transparent border-none cursor-pointer p-0 z-50"
        style={{ 
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 12, 
          height: 12,
        }}
        disabled={!hasPrevPage}
        aria-label="Go to previous page"
      >
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={{
            opacity: isHovered && hasPrevPage && isNearLeftEdge ? 1 : 0.6,
          }}
          transition={{ duration: 0.15 }}
        >
          {/* Horizontal line - stays in place */}
          <path
            d="M12 11H1"
            className="stroke-[#1E1E1E] dark:stroke-white"
            strokeWidth="2"
          />
          {/* Vertical line morphs to diagonal for arrow */}
          <motion.path
            className="stroke-[#1E1E1E] dark:stroke-white"
            strokeWidth="2"
            animate={{
              d: isHovered && hasPrevPage && isNearLeftEdge
                ? "M1 11L6 6"   // Diagonal up-right (arrow pointing left)
                : "M1 11L1 0",  // Vertical up (bracket)
            }}
            transition={springTransition}
          />
        </motion.svg>
      </motion.button>

      <div className="relative flex items-end justify-center z-10">
        <LayoutGroup>
          <motion.ul
            className="flex items-end justify-center list-none m-0 p-0"
            style={{ height: 36 }}
            initial={{ gap: '12px', x: 0 }}
            animate={{ 
              gap: isHovered ? '48px' : '12px',
              x: isHovered ? centerOffset : 0,
            }}
            transition={springTransition}
            layout
          >
          {NAV_ITEMS.map((item, index) => {
            const isActive = activeRoute === item.route;
            const labelWidth = labelWidths[index] || 0;
            const isTabHovered = hoveredTab === item.route;
            const isTabPressed = pressedTab === item.route;

            // Bar heights: collapsed active=24, inactive=12; expanded active=15, inactive=3
            // For inactive tabs: +3px on hover, -3px on press (from hover state)
            let barHeight = isHovered
              ? isActive ? 15 : 3
              : isActive ? 24 : 12;
            
            if (!isActive) {
              if (isTabPressed) {
                // Pressed state: shrink by 3px from base
                barHeight -= 3;
              } else if (isTabHovered) {
                // Hover state: grow by 3px
                barHeight += 3;
              }
            }

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
                  onMouseEnter={() => !isActive && setHoveredTab(item.route)}
                  onMouseLeave={() => {
                    setHoveredTab(null);
                    setPressedTab(null);
                  }}
                  onMouseDown={() => !isActive && setPressedTab(item.route)}
                  onMouseUp={() => setPressedTab(null)}
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
      </div>

      {/* Right Arrow - Fixed to bottom right corner */}
      <motion.button
        onClick={goToNextPage}
        className="relative bg-transparent border-none cursor-pointer p-0 z-50"
        style={{ 
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 12, 
          height: 12,
        }}
        disabled={!hasNextPage}
        aria-label="Go to next page"
      >
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={{
            opacity: isHovered && hasNextPage && isNearRightEdge ? 1 : 0.6,
          }}
          transition={{ duration: 0.15 }}
        >
          {/* Horizontal line - stays in place */}
          <path
            d="M11 11H0"
            className="stroke-[#1E1E1E] dark:stroke-white"
            strokeWidth="2"
          />
          {/* Vertical line morphs to diagonal for arrow */}
          <motion.path
            className="stroke-[#1E1E1E] dark:stroke-white"
            strokeWidth="2"
            animate={{
              d: isHovered && hasNextPage && isNearRightEdge
                ? "M11 11L6 6"   // Diagonal up-left (arrow pointing right)
                : "M11 11L11 0", // Vertical up (bracket)
            }}
            transition={springTransition}
          />
        </motion.svg>
      </motion.button>
    </nav>
  );
}
