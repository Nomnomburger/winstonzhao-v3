'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import DesktopNavigationToggle from '@/components/panels/DesktopNavigationToggle';
import MobileNavigationToggle from '@/components/panels/MobileNavigationToggle';
import { ScrambleText, useIsMobile } from '@/components/panels/shared';
import { translations } from '@/components/panels/translations';
import { useLanguage } from '@/components/panels/useLanguage';
import useNavigationContrast from '@/components/useNavigationContrast';

export type NavigationToggleConfig = {
  enabled: boolean;
  progress: MotionValue<number>;
  menuProgress: MotionValue<number>;
  heroTop: number;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  closing?: boolean;
  navigationId: string;
  onClick: () => void;
  onHomeNavigate?: () => void;
  instant: boolean;
  delay: number;
};

type NavigationBinding = {
  bind: (owner: string, config: NavigationToggleConfig) => void;
  release: (owner: string) => void;
  hasSource: boolean;
  prepareName: () => void;
  nameHoverBlockedRef: RefObject<boolean>;
};

const NavigationContext = createContext<NavigationBinding | null>(null);
const NAVIGATION_EASE = [0.76, 0, 0.15, 1] as const;
const subscribeToHydration = () => () => {};

// Route panels supply their existing scroll/menu state. The actual controls
// remain in the root layout, retaining their motion values during navigation.
export function useNavigationToggle(config: NavigationToggleConfig) {
  const binding = useContext(NavigationContext);
  const owner = useId();
  if (!binding) throw new Error('useNavigationToggle requires NavigationProvider');
  const { bind, release } = binding;

  useLayoutEffect(() => {
    bind(owner, config);
  }, [bind, owner, config]);

  useLayoutEffect(() => () => release(owner), [owner, release]);
}

// The first home visit may arrive from a directly loaded project. A previous
// source distinguishes that navigation from a fresh home-page load.
export function useHasNavigationSource() {
  return useContext(NavigationContext)?.hasSource ?? false;
}

export function useNavigationNameHoverBlock() {
  return useContext(NavigationContext)?.nameHoverBlockedRef;
}

// Hide the incoming home words before its first paint. Their original hero
// markup resumes once the persistent words reach the same viewport geometry.
export function useNavigationNameHandoff() {
  const binding = useContext(NavigationContext);
  const prepareName = binding?.prepareName;
  useLayoutEffect(() => prepareName?.(), [prepareName]);
}

type WordRect = { left: number; top: number; width: number; height: number };
type NameRects = [WordRect, WordRect];
type WordMotion = { x: MotionValue<number>; y: MotionValue<number>; scaleX: MotionValue<number>; scaleY: MotionValue<number> };

function useWordMotion(): WordMotion {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  return useMemo(() => ({ x, y, scaleX, scaleY }), [x, y, scaleX, scaleY]);
}

function readRect(element: HTMLElement): WordRect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function homeWords(): [HTMLElement, HTMLElement] | null {
  const first = document.querySelector<HTMLElement>('[data-navigation-name="first"]');
  const last = document.querySelector<HTMLElement>('[data-navigation-name="last"]');
  return first && last ? [first, last] : null;
}

function rectsChanged(a: NameRects, b: NameRects) {
  return a.some((rect, index) => (['left', 'top', 'width', 'height'] as const)
    .some((key) => Math.abs(rect[key] - b[index][key]) > 0.5));
}

function useNameHandoff(pathname: string, reducedMotion: boolean | null) {
  const firstRef = useRef<HTMLSpanElement>(null);
  const lastRef = useRef<HTMLSpanElement>(null);
  const first = useWordMotion();
  const last = useWordMotion();
  const words = useMemo(() => [first, last] as const, [first, last]);
  const animationVisible = useMotionValue(false);
  const animating = useSyncExternalStore(
    (listener) => animationVisible.on('change', listener),
    () => animationVisible.get(),
    () => false,
  );
  const firstElementRef = useCallback((element: HTMLSpanElement | null) => { firstRef.current = element; }, []);
  const lastElementRef = useCallback((element: HTMLSpanElement | null) => { lastRef.current = element; }, []);
  const pathRef = useRef(pathname);
  const activeRef = useRef(false);
  const reducedRef = useRef(reducedMotion);
  const compactRef = useRef<NameRects | null>(null);
  const visibleHomeRef = useRef<NameRects | null>(null);
  const hiddenRef = useRef(new Map<HTMLElement, string>());
  const animationsRef = useRef<Array<ReturnType<typeof animate>>>([]);
  const frameRef = useRef(0);
  const generationRef = useRef(0);
  const runRef = useRef(0);

  useLayoutEffect(() => { reducedRef.current = reducedMotion; }, [reducedMotion]);

  const hideHomeWords = useCallback(() => {
    const elements = homeWords();
    if (!elements) return null;
    for (const element of elements) {
      if (!hiddenRef.current.has(element)) hiddenRef.current.set(element, element.style.visibility);
      element.style.visibility = 'hidden';
    }
    return elements;
  }, []);

  const restoreHomeWords = useCallback(() => {
    hiddenRef.current.forEach((visibility, element) => { element.style.visibility = visibility; });
    hiddenRef.current.clear();
  }, []);

  const prepareName = useCallback(() => {
    if (pathRef.current === '/' && !activeRef.current) return;
    hideHomeWords();
    animationVisible.set(true);
  }, [animationVisible, hideHomeWords]);

  const measureCompact = useCallback((): NameRects | null => {
    const elements = [firstRef.current, lastRef.current];
    if (!elements[0] || !elements[1]) return null;
    // Read the native compact boxes without depending on projection snapshots
    // or ancestor transforms. Restore styles synchronously before any paint.
    const transforms = elements.map((element) => element!.style.transform);
    elements.forEach((element) => { element!.style.transform = 'none'; });
    const rects = elements.map((element) => readRect(element!)) as NameRects;
    elements.forEach((element, index) => { element!.style.transform = transforms[index]; });
    compactRef.current = rects;
    return rects;
  }, []);

  const placeWords = useCallback((rects: NameRects, compact: NameRects) => {
    words.forEach((word, index) => {
      word.x.set(rects[index].left - compact[index].left);
      word.y.set(rects[index].top - compact[index].top);
      word.scaleX.set(rects[index].width / Math.max(1, compact[index].width));
      word.scaleY.set(rects[index].height / Math.max(1, compact[index].height));
    });
  }, [words]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    animationsRef.current.forEach((animation) => animation.stop());
    animationsRef.current = [];
    runRef.current += 1;
  }, []);

  useLayoutEffect(() => {
    const previousPath = pathRef.current;
    pathRef.current = pathname;
    const compact = measureCompact();
    if (!compact || previousPath === pathname) return;

    const rendered = firstRef.current && lastRef.current
      ? [readRect(firstRef.current), readRect(lastRef.current)] as NameRects : compact;
    const outgoing = previousPath === '/' && !activeRef.current && visibleHomeRef.current
      ? visibleHomeRef.current : rendered;
    stop();
    const generation = ++generationRef.current;
    placeWords(outgoing, compact);
    if (pathname === '/resume') {
      activeRef.current = false;
      restoreHomeWords();
      animationVisible.set(false);
      return;
    }

    activeRef.current = true;
    animationVisible.set(true);
    if (pathname === '/') hideHomeWords();
    else restoreHomeWords();
    let latestTarget: NameRects | null = null;
    let deadline = 0;

    const finish = () => {
      if (generationRef.current !== generation) return;
      if (pathname === '/' && latestTarget) visibleHomeRef.current = latestTarget;
      activeRef.current = false;
      restoreHomeWords();
      animationVisible.set(false);
      cancelAnimationFrame(frameRef.current);
    };

    const run = (target: NameRects, duration: number, stagger: boolean) => {
      animationsRef.current.forEach((animation) => animation.stop());
      const runId = ++runRef.current;
      latestTarget = target;
      if (reducedRef.current) {
        placeWords(target, compact);
        finish();
        return;
      }
      animationsRef.current = words.flatMap((word, index) => {
        const transition = { duration, delay: stagger ? index * 0.06 : 0, ease: NAVIGATION_EASE };
        return [
          animate(word.x, target[index].left - compact[index].left, transition),
          animate(word.y, target[index].top - compact[index].top, transition),
          animate(word.scaleX, target[index].width / Math.max(1, compact[index].width), transition),
          animate(word.scaleY, target[index].height / Math.max(1, compact[index].height), transition),
        ];
      });
      void Promise.all(animationsRef.current).then(() => {
        if (generationRef.current === generation && runRef.current === runId) finish();
      });
    };

    const measureIncoming = () => {
      if (generationRef.current !== generation) return;
      const elements = pathname === '/' ? hideHomeWords() : null;
      if (pathname === '/' && !elements) {
        frameRef.current = requestAnimationFrame(measureIncoming);
        return;
      }
      const target = elements ? elements.map(readRect) as NameRects : compact;
      deadline = performance.now() + 860;
      run(target, 0.8, true);
      if (!activeRef.current || pathname !== '/') return;
      const followGeometry = () => {
        if (!activeRef.current || generationRef.current !== generation) return;
        const current = hideHomeWords();
        if (current) {
          const nextTarget = current.map(readRect) as NameRects;
          if (latestTarget && rectsChanged(latestTarget, nextTarget)) {
            run(nextTarget, Math.max(0.08, (deadline - performance.now()) / 1000), false);
          }
        }
        frameRef.current = requestAnimationFrame(followGeometry);
      };
      frameRef.current = requestAnimationFrame(followGeometry);
    };

    if (pathname === '/') {
      // Text fitting and browser Back scroll restoration both settle after
      // mount. Measure their physical result rather than an unscaled layout.
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(measureIncoming);
      });
    } else measureIncoming();
    return () => stop();
  }, [animationVisible, hideHomeWords, measureCompact, pathname, placeWords, restoreHomeWords, stop, words]);

  useLayoutEffect(() => {
    let frame = 0;
    const onResize = () => { measureCompact(); };
    window.addEventListener('resize', onResize);
    if (pathname !== '/') return () => window.removeEventListener('resize', onResize);
    const sample = () => {
      if (!activeRef.current) {
        const elements = homeWords();
        if (elements) {
          const rects = elements.map(readRect) as NameRects;
          visibleHomeRef.current = rects;
          const compact = compactRef.current ?? measureCompact();
          if (compact) placeWords(rects, compact);
        }
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [measureCompact, pathname, placeWords]);

  useLayoutEffect(() => () => {
    generationRef.current += 1;
    stop();
    restoreHomeWords();
  }, [restoreHomeWords, stop]);

  return { animating, prepareName, firstElementRef, lastElementRef, first, last };
}

function sameSettings(previous: NavigationToggleConfig | null, next: NavigationToggleConfig) {
  return previous !== null && previous.enabled === next.enabled && previous.heroTop === next.heroTop &&
    previous.triggerRef === next.triggerRef && previous.open === next.open && previous.closing === next.closing &&
    previous.navigationId === next.navigationId && previous.instant === next.instant && previous.delay === next.delay;
}

export default function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const { language } = useLanguage();
  const name = translations[language].name;
  const firstSpace = name.indexOf(' ');
  const firstName = firstSpace === -1 ? name : name.slice(0, firstSpace);
  const lastName = firstSpace === -1 ? '' : name.slice(firstSpace + 1);
  const [settings, setSettings] = useState<NavigationToggleConfig | null>(null);
  const ownerRef = useRef<string | null>(null);
  const configRef = useRef<NavigationToggleConfig | null>(null);
  const lastSourceRef = useRef<NavigationToggleConfig | null>(null);
  const revisionRef = useRef(0);
  const initializedRef = useRef(false);
  const nameHoverBlockedRef = useRef(false);
  const reducedMotionRef = useRef(reducedMotion);
  const subscriptionsRef = useRef<Array<() => void>>([]);
  const handoffAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const fallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const progress = useMotionValue(pathname === '/' ? 0 : 1);
  const menuProgress = useMotionValue(0);
  const heroTop = useMotionValue(36);
  const handoffProgress = useMotionValue(1);
  const { animating: nameAnimating, prepareName, firstElementRef, lastElementRef, first: firstWord, last: lastWord } = useNameHandoff(pathname, reducedMotion);

  useLayoutEffect(() => {
    reducedMotionRef.current = reducedMotion;
    if (reducedMotion) {
      handoffAnimationRef.current?.stop();
      handoffProgress.set(1);
    }
  }, [handoffProgress, reducedMotion]);

  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    subscriptionsRef.current = [];
    handoffAnimationRef.current?.stop();
    handoffAnimationRef.current = null;
  }, []);

  const bind = useCallback((owner: string, config: NavigationToggleConfig) => {
    revisionRef.current += 1;
    const previousSource = lastSourceRef.current;
    const sourceChanged = subscriptionsRef.current.length === 0 || ownerRef.current !== owner || previousSource?.progress !== config.progress ||
      previousSource?.menuProgress !== config.menuProgress;
    ownerRef.current = owner;
    configRef.current = config;
    lastSourceRef.current = config;
    setSettings((previous) => sameSettings(previous, config) ? previous : config);
    if (!sourceChanged) {
      // Registration can repeat while a handoff is running. Keep its position
      // blend intact; resize geometry is read live by the same subscription.
      if (handoffProgress.get() >= 1) heroTop.set(config.heroTop);
      return;
    }

    disconnect();
    const startProgress = progress.get();
    const startMenuProgress = menuProgress.get();
    const startHeroTop = heroTop.get();
    const firstBinding = !initializedRef.current;
    initializedRef.current = true;
    handoffProgress.set(firstBinding || reducedMotionRef.current ? 1 : 0);
    const sync = () => {
      const blend = handoffProgress.get();
      progress.set(startProgress + (config.progress.get() - startProgress) * blend);
      menuProgress.set(startMenuProgress + (config.menuProgress.get() - startMenuProgress) * blend);
      heroTop.set(startHeroTop + ((lastSourceRef.current?.heroTop ?? config.heroTop) - startHeroTop) * blend);
    };
    subscriptionsRef.current = [
      config.progress.on('change', sync),
      config.menuProgress.on('change', sync),
      handoffProgress.on('change', sync),
    ];
    sync();
    if (!firstBinding && !reducedMotionRef.current) {
      handoffAnimationRef.current = animate(handoffProgress, 1, { duration: 0.8, ease: NAVIGATION_EASE });
    }
  }, [disconnect, handoffProgress, heroTop, menuProgress, progress]);

  const release = useCallback((owner: string) => {
    const revision = revisionRef.current;
    // A new route can bind in the same commit that the previous route cleans
    // up. Never detach that newer owner, including responsive panel changes.
    queueMicrotask(() => {
      if (ownerRef.current !== owner || revisionRef.current !== revision) return;
      ownerRef.current = null;
      configRef.current = null;
      disconnect();
      // Keep the last rendered geometry while a streamed page is arriving.
    });
  }, [disconnect]);

  useLayoutEffect(() => disconnect, [disconnect]);
  useLayoutEffect(() => {
    // The home name can appear beneath a stationary pointer during handoff.
    // Only actual mouse movement outside the name re-enables its preview.
    const unblockNameHover = (event: MouseEvent) => {
      if (!nameHoverBlockedRef.current) return;
      const names = document.querySelectorAll<HTMLElement>('[data-navigation-name-trigger]');
      const insideName = Array.from(names).some((name) => {
        const rect = name.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (!insideName) nameHoverBlockedRef.current = false;
    };
    const leaveDocument = () => { nameHoverBlockedRef.current = false; };
    window.addEventListener('mousemove', unblockNameHover);
    document.addEventListener('mouseleave', leaveDocument);
    return () => {
      window.removeEventListener('mousemove', unblockNameHover);
      document.removeEventListener('mouseleave', leaveDocument);
    };
  }, []);
  const hasSource = settings !== null;
  const binding = useMemo(() => ({ bind, release, hasSource, prepareName, nameHoverBlockedRef }), [bind, release, hasSource, prepareName]);
  const onClick = useCallback(() => configRef.current?.onClick(), []);
  const onHomeNavigate = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.detail > 0 && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      nameHoverBlockedRef.current = true;
    }
    configRef.current?.onHomeNavigate?.();
  }, []);
  const open = settings?.open ?? false;
  useNavigationContrast(pathname, open);
  const menuColor = useTransform(() => isMobile || open || progress.get() >= 0.7 ? 'var(--navigation-menu-color, var(--navigation-foreground))' : 'var(--foreground)');
  const resume = pathname === '/resume';
  // Keep server and hydration markup identical even when a static deployment
  // renders with a different pathname, so the transition copy never leaks.
  const showName = hydrated && pathname !== '/' && !resume;
  const enabled = !resume && (settings?.enabled ?? pathname.startsWith('/projects/'));
  const triggerRef = settings?.triggerRef ?? fallbackTriggerRef;
  const instant = settings?.instant ?? true;

  return (
    <NavigationContext.Provider value={binding}>
      <>
        {/* Persistent words animate through physical viewport rectangles;
            the home hero resumes only after the two boxes agree. */}
        <motion.div
          id="site-navigation-name"
          data-site-navigation="name"
          aria-hidden={!showName}
          inert={!showName}
          className="navigation-color-fade fixed left-6 top-6 z-50 md:left-9 md:top-9"
          style={{ color: 'var(--navigation-name-color, var(--navigation-foreground))', visibility: showName || nameAnimating && !resume ? 'visible' : 'hidden' }}
        >
          <Link
            href="/"
            aria-label="Home"
            data-navigation-name-trigger
            onClick={onHomeNavigate}
            className="block font-medium text-[20px] md:text-[24px] tracking-[-0.05em] leading-none whitespace-nowrap"
            style={{ marginTop: '-0.1em' }}
          >
            <motion.span ref={firstElementRef} style={{ ...firstWord, originX: 0, originY: 0 }} className="inline-block align-top">
              <ScrambleText charDelay={0.02}>{firstName}</ScrambleText>
            </motion.span>
            {lastName && <>{' '}<motion.span ref={lastElementRef} style={{ ...lastWord, originX: 0, originY: 0 }} className="inline-block align-top">
              <ScrambleText charDelay={0.02}>{lastName}</ScrambleText>
            </motion.span></>}
          </Link>
        </motion.div>
        <motion.div
          id="site-navigation-toggle"
          data-site-navigation="toggle"
          aria-hidden={!enabled}
          inert={!enabled}
          className="navigation-color-fade pointer-events-none fixed right-6 top-6 z-[60] md:right-9 md:top-9"
          initial={false}
          animate={{ opacity: enabled ? 1 : 0, y: isMobile && !enabled ? 20 : 0, scale: !isMobile && !enabled ? 0.8 : 1 }}
          transition={{ duration: reducedMotion || instant ? 0 : isMobile ? 0.6 : 0.8, delay: enabled && !instant ? settings?.delay ?? 0 : 0, ease: [0.4, 0, 0.2, 1] }}
          style={{ color: menuColor, visibility: enabled ? 'visible' : 'hidden' }}
        >
          {isMobile ? <MobileNavigationToggle
            triggerRef={triggerRef}
            open={open}
            closing={settings?.closing ?? false}
            navigationId={settings?.navigationId ?? 'site-navigation-menu'}
            onClick={onClick}
          /> : <DesktopNavigationToggle
            progress={progress}
            menuProgress={menuProgress}
            heroTop={heroTop}
            triggerRef={triggerRef}
            open={open}
            navigationId={settings?.navigationId ?? 'site-navigation-menu'}
            onClick={onClick}
            instant
            embedded
            delay={0}
          />}
        </motion.div>
        {children}
      </>
    </NavigationContext.Provider>
  );
}
