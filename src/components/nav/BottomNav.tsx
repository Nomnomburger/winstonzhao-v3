'use client';

import { useState } from 'react';

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

export default function BottomNav({ activeRoute, onNavigate }: BottomNavProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-[36px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Main navigation"
    >
      <div
        className={`flex items-end justify-center transition-[gap] duration-300 ease-in-out ${
          isHovered ? 'gap-[48px]' : 'gap-[10px]'
        }`}
        style={{ 
          height: '36px',
          transitionDelay: isHovered ? '0ms' : '200ms', // Delay gap transition when collapsing so text disappears first
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.route;
          
          // Calculate line dimensions
          // In collapsed: active is 36px, inactive is 16px (both reach bottom)
          // In expanded: active is 15px, inactive is 3px (bottom moves up to make room for text)
          const lineHeight = isHovered
            ? isActive
              ? 15
              : 3
            : isActive
              ? 36
              : 16;
          
          // Line bottom position: in collapsed it's at 0 (bottom), in expanded it's above text (18px from bottom = 16px text + 2px gap)
          const lineBottom = isHovered ? 22 : 0;
          
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className="flex flex-col items-center justify-end relative shrink-0"
              style={{ height: '36px' }}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Container for line and text */}
              <div 
                className="flex flex-col items-center justify-end gap-[2px] relative" 
                style={{ 
                  height: '36px',
                  width: isHovered ? 'auto' : '2px',
                  minWidth: isHovered ? 'auto' : '2px',
                }}
              >
                {/* Bar/Line indicator - positioned absolutely, bottom moves up to make room for text, shrinks from bottom */}
                <div
                  className="w-[2px] bg-black transition-all duration-300 ease-in-out absolute"
                  style={{
                    height: `${lineHeight}px`,
                    bottom: `${lineBottom}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    transitionDelay: isHovered ? '0ms' : '200ms', // Delay when collapsing so text disappears first
                  }}
                />

                {/* Invisible spacer - maintains width when expanded, hidden when collapsed */}
                <span 
                  className={`text-[16px] leading-normal tracking-[-0.32px] whitespace-nowrap pointer-events-none ${
                    isHovered ? 'invisible' : 'hidden'
                  }`}
                  style={{ 
                    fontFamily: 'var(--font-pp-neue-montreal), Arial, Helvetica, sans-serif',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>

                {/* Text label - always absolutely positioned to never affect layout */}
                <p
                  className={`text-[16px] leading-normal tracking-[-0.32px] text-black whitespace-nowrap absolute ${
                    isHovered
                      ? 'opacity-100'
                      : 'opacity-0 pointer-events-none'
                  } ${isActive ? 'font-medium' : 'font-normal'}`}
                  style={{ 
                    fontFamily: 'var(--font-pp-neue-montreal), Arial, Helvetica, sans-serif',
                    bottom: 0,
                    left: '50%',
                    transform: isHovered ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, 0) scale(0.96)',
                    transition: 'opacity 150ms ease-out, transform 150ms ease-out',
                    transitionDelay: isHovered ? '200ms' : '0ms', // Delay when expanding so lines move up first
                  }}
                >
                  {item.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

