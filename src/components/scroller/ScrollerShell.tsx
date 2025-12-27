'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import BottomNav from '../nav/BottomNav';
import HomePanel from '../panels/HomePanel';
import AboutPanel from '../panels/AboutPanel';
import ContactPanel from '../panels/ContactPanel';

// Lazy load heavy panels
const ProjectsPanel = dynamic(() => import('../panels/ProjectsPanel'), {
  ssr: false,
});
const PlaygroundPanel = dynamic(() => import('../panels/PlaygroundPanel'), {
  ssr: false,
});

const ROUTES = ['home', 'projects', 'playground', 'about', 'contact'] as const;
type RouteName = typeof ROUTES[number];

const ROUTE_TO_INDEX: Record<RouteName, number> = {
  home: 0,
  projects: 1,
  playground: 2,
  about: 3,
  contact: 4,
};

const INDEX_TO_ROUTE: Record<number, RouteName> = {
  0: 'home',
  1: 'projects',
  2: 'playground',
  3: 'about',
  4: 'contact',
};

const ROUTE_TO_PATH: Record<RouteName, string> = {
  home: '/',
  projects: '/projects',
  playground: '/playground',
  about: '/about',
  contact: '/contact',
};

export default function ScrollerShell() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Determine index from current pathname (memoized with empty deps since it doesn't depend on any state/props)
  const getIndexFromPath = useCallback((currentPathname: string): number => {
    for (const [route, path] of Object.entries(ROUTE_TO_PATH)) {
      if (currentPathname === path) {
        return ROUTE_TO_INDEX[route as RouteName];
      }
    }
    return 0; // Default to home
  }, []); // Empty deps - function doesn't depend on any state/props
  
  // Get initial index from pathname
  const initialIndexValue = typeof window !== 'undefined' && pathname ? getIndexFromPath(pathname) : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndexValue);
  const overflowForceRef = useRef(0);
  const lastDeltaRef = useRef({ deltaX: 0, deltaY: 0 });
  const isScrollingRef = useRef(false);
  const activeIndexRef = useRef(initialIndexValue);
  const isInitializingRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Thresholds for elastic snap feel
  const OVERFLOW_THRESHOLD = 260;
  const SNAP_SETTLE_TIMEOUT = 120;

  const goToIndex = useCallback((targetIndex: number, smooth = true) => {
    if (targetIndex < 0 || targetIndex >= ROUTES.length) return;
    if (!containerRef.current) return;

    const targetScrollLeft = targetIndex * window.innerWidth;
    isScrollingRef.current = true;

    if (smooth) {
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });

      // After smooth scroll, snap to exact position
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            left: targetScrollLeft,
            behavior: 'auto',
          });
        }
        setActiveIndex(targetIndex);
        isScrollingRef.current = false;
      }, SNAP_SETTLE_TIMEOUT);
    } else {
      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'auto',
      });
      setActiveIndex(targetIndex);
      isScrollingRef.current = false;
    }

    overflowForceRef.current = 0;
  }, []);

  const goToRoute = useCallback((routeName: RouteName) => {
    const index = ROUTE_TO_INDEX[routeName];
    const path = ROUTE_TO_PATH[routeName];
    // Update URL immediately when explicitly navigating via nav
    if (pathname !== path) {
      router.replace(path, { scroll: false });
    }
    goToIndex(index);
  }, [goToIndex, pathname, router]);

  // Update URL when activeIndex changes (debounced to avoid rapid navigation)
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Don't update URL during initialization or when pathname already matches
    if (isInitializingRef.current || !hasInitializedRef.current) return;
    
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }
    
    urlUpdateTimeoutRef.current = setTimeout(() => {
      const route = INDEX_TO_ROUTE[activeIndex];
      const path = ROUTE_TO_PATH[route];
      if (pathname !== path) {
        router.replace(path, { scroll: false });
      }
    }, 150); // Wait 150ms after index change before updating URL
    
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [activeIndex, pathname, router]);

  // Initialize scroll position on mount (only once)
  useLayoutEffect(() => {
    if (!containerRef.current || hasInitializedRef.current) return;
    
    const initIndex = pathname ? getIndexFromPath(pathname) : 0;
    const expectedScroll = initIndex * window.innerWidth;
    
    // Set scroll position immediately and synchronously
    containerRef.current.scrollLeft = expectedScroll;
    setActiveIndex(initIndex);
    activeIndexRef.current = initIndex;
    hasInitializedRef.current = true;
    
    setTimeout(() => {
      isInitializingRef.current = false;
    }, 100);
  }, [pathname, getIndexFromPath]);

  // Update scroll position when pathname changes (but component stays mounted)
  useLayoutEffect(() => {
    if (!containerRef.current || !hasInitializedRef.current) return;
    
    const newIndex = pathname ? getIndexFromPath(pathname) : 0;
    if (newIndex !== activeIndexRef.current) {
      const expectedScroll = newIndex * window.innerWidth;
      // Use instant scroll (no smooth) for route changes
      containerRef.current.scrollLeft = expectedScroll;
      setActiveIndex(newIndex);
      activeIndexRef.current = newIndex;
    }
  }, [pathname, getIndexFromPath]); // Removed activeIndex from deps since we use activeIndexRef.current

  // Keep activeIndexRef in sync
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Handle scroll events to track active panel (only update after scroll settles)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;
    
    const handleScroll = () => {
      // Don't track during initialization
      if (isInitializingRef.current) return;
      
      clearTimeout(scrollTimeout);
      
      // Wait for scroll to settle before updating index
      scrollTimeout = setTimeout(() => {
        if (isScrollingRef.current || isInitializingRef.current) return;
        const scrollLeft = container.scrollLeft;
        const panelWidth = window.innerWidth;
        const newIndex = Math.round(scrollLeft / panelWidth);
        
        if (newIndex !== activeIndexRef.current && newIndex >= 0 && newIndex < ROUTES.length) {
          setActiveIndex(newIndex);
        }
      }, 150); // Wait 150ms after scrolling stops
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Wheel handler for vertical/horizontal scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const absDeltaX = Math.abs(e.deltaX);
      const absDeltaY = Math.abs(e.deltaY);

      // For primarily horizontal scrolling, let CSS scroll-snap handle it naturally
      if (absDeltaX > absDeltaY) {
        // Don't prevent default - let browser handle horizontal scroll with snap
        return;
      }

      // For vertical scrolling, we need to intercept to handle panel scrolling
      const panelScrollEl = panelScrollRefs.current[activeIndex];
      if (!panelScrollEl) return;

      const { scrollTop, scrollHeight, clientHeight } = panelScrollEl;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // If panel can scroll vertically, prevent default and scroll the panel
      if (scrollHeight > clientHeight) {
        if ((!atTop && e.deltaY < 0) || (!atBottom && e.deltaY > 0)) {
          e.preventDefault();
          panelScrollEl.scrollTop += e.deltaY;
          overflowForceRef.current = 0;
          
          // Reset overflow force if scrolling opposite direction
          if (
            (lastDeltaRef.current.deltaY > 0 && e.deltaY < 0) ||
            (lastDeltaRef.current.deltaY < 0 && e.deltaY > 0)
          ) {
            overflowForceRef.current = 0;
          }
          lastDeltaRef.current = { deltaX: e.deltaX, deltaY: e.deltaY };
          return;
        }
      }

      // At boundaries: prevent default and accumulate overflow force
      if ((atBottom && e.deltaY > 0) || (atTop && e.deltaY < 0)) {
        e.preventDefault();
        
        // Reset overflow force if scrolling opposite direction
        if (
          (lastDeltaRef.current.deltaY > 0 && e.deltaY < 0) ||
          (lastDeltaRef.current.deltaY < 0 && e.deltaY > 0)
        ) {
          overflowForceRef.current = 0;
        }
        lastDeltaRef.current = { deltaX: e.deltaX, deltaY: e.deltaY };

        if (atBottom && e.deltaY > 0) {
          overflowForceRef.current += e.deltaY;
          if (overflowForceRef.current > OVERFLOW_THRESHOLD) {
            if (activeIndex < ROUTES.length - 1) {
              goToIndex(activeIndex + 1);
            } else {
              overflowForceRef.current = OVERFLOW_THRESHOLD; // Clamp at max
            }
          }
        } else if (atTop && e.deltaY < 0) {
          overflowForceRef.current -= e.deltaY;
          if (overflowForceRef.current > OVERFLOW_THRESHOLD) {
            if (activeIndex > 0) {
              goToIndex(activeIndex - 1);
            } else {
              overflowForceRef.current = OVERFLOW_THRESHOLD; // Clamp at max
            }
          }
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [activeIndex, goToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        goToIndex(activeIndex - 1);
      } else if (e.key === 'ArrowRight' && activeIndex < ROUTES.length - 1) {
        goToIndex(activeIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, goToIndex]);

  // Touch handling for mobile swipe
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX || !touchStartY) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      // Determine if horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping = true;
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartX || !touchStartY || !isSwiping) return;

      const touchX = e.changedTouches[0].clientX;
      const deltaX = touchX - touchStartX;
      const threshold = 50;

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && activeIndex > 0) {
          goToIndex(activeIndex - 1);
        } else if (deltaX < 0 && activeIndex < ROUTES.length - 1) {
          goToIndex(activeIndex + 1);
        }
      }

      touchStartX = 0;
      touchStartY = 0;
      isSwiping = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeIndex, goToIndex]);

  const currentRoute = INDEX_TO_ROUTE[activeIndex];

  return (
    <div className="relative w-screen h-screen">
      <div
        ref={containerRef}
        className="flex w-screen h-screen overflow-x-scroll overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >

        {/* Home Panel */}
        <div className="w-screen h-screen shrink-0 snap-start">
          <div
            ref={(el) => { panelScrollRefs.current[0] = el; }}
            className="h-screen overflow-y-auto overscroll-contain"
          >
            <HomePanel />
          </div>
        </div>

        {/* Projects Panel */}
        <div className="w-screen h-screen shrink-0 snap-start">
          <div
            ref={(el) => { panelScrollRefs.current[1] = el; }}
            className="h-screen overflow-y-auto overscroll-contain"
          >
            <ProjectsPanel />
          </div>
        </div>

        {/* Playground Panel */}
        <div className="w-screen h-screen shrink-0 snap-start">
          <div
            ref={(el) => { panelScrollRefs.current[2] = el; }}
            className="h-screen overflow-y-auto overscroll-contain"
          >
            <PlaygroundPanel />
          </div>
        </div>

        {/* About Panel */}
        <div className="w-screen h-screen shrink-0 snap-start">
          <div
            ref={(el) => { panelScrollRefs.current[3] = el; }}
            className="h-screen overflow-y-auto overscroll-contain"
          >
            <AboutPanel />
          </div>
        </div>

        {/* Contact Panel */}
        <div className="w-screen h-screen shrink-0 snap-start">
          <div
            ref={(el) => { panelScrollRefs.current[4] = el; }}
            className="h-screen overflow-y-auto overscroll-contain"
          >
            <ContactPanel />
          </div>
        </div>
      </div>

      <BottomNav activeRoute={currentRoute} onNavigate={goToRoute} />
    </div>
  );
}

