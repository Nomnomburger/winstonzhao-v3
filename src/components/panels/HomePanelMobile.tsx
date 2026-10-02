'use client';

import { motion, AnimatePresence, animate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatedText,
  ScrambleText,
  formatTorontoTime,
  useCurrentTime,
  WZLogo,
  LanguageGlobe,
  NewlyRole,
  FigmaRole,
  OLD_SITE_URL,
  RESUME_URL,
  EMAIL,
} from './shared';
import { Language, translations } from './translations';
import HomeProjects from '@/components/projects/HomeProjects';
import type { ProjectCardData } from '@/components/projects/types';
import HomeNavigationBackdrop from './HomeNavigationBackdrop';
import { useNavigationNameHandoff, useNavigationToggle } from '@/components/NavigationProvider';
import { documentTop, useHeroScroll } from './useHeroScroll';
import MorphingBio, { HERO_BIO_LAYOUT_TRANSITION, heroBioSpaceProgress } from './MorphingBio';
import HomeMenuLinks, { MENU_BLUR_TRANSITION, MenuRevealText } from './HomeMenuLinks';
import { HeroBioWordRevealContext } from './HeroBioLine';
import TextRevealMask from './TextRevealMask';
import { expandedBioLines } from './bio-copy';
import { useHomeMenu, useMenuHeaderHandoff } from './useHomeMenu';
import { revealMaskAnimation } from './text-reveal';
import { scrollInstantly } from '@/lib/smooth-scroll';

// "Zhao" sits in the second of the two mobile grid columns: half the
// container width plus half the 12px column gap (~51.7% of the row).
const ZHAO_COLUMN_OFFSET_RATIO = 0.517;

// Profile photo height relative to the shrunk font size — matches the visual
// (cap) height of "Zhao" (46px photo next to 64px text in the original design).
const PHOTO_TO_FONT_RATIO = 46 / 64;

// Vertical column guides are hidden in the current design.
// Flip this back to true to restore them.
const SHOW_COLUMN_GUIDES = false;

const PROJECTS_DOCK_TOP = 96;
const PROJECTS_RISE_START = 0.05;
const PROJECTS_RISE_EASE_END = 0.6;
const BIO_NAME_LEAD = 0.18;
const BIO_NAME_RETURN_DELAY = 0.3;

type BioReturnPhase = 'idle' | 'hidden' | 'revealing';

function MobileBioMenuRevealWord({ children, order, phase, reducedMotion }: {
  children: ReactNode;
  order: number;
  phase: BioReturnPhase;
  reducedMotion: boolean;
}) {
  const enabled = phase !== 'idle';
  const open = phase === 'revealing';
  const delay = order * 0.03;

  return (
    <TextRevealMask active={enabled && open} delay={delay} duration={MENU_BLUR_TRANSITION.duration} instant={!enabled || reducedMotion}>
      <MenuRevealText
        open={open}
        enabled={enabled}
        reducedMotion={reducedMotion}
        distance="0.4em"
        enterDelay={delay}
        exitDelay={0}
        className="bio-menu-reveal-word text-reveal-word inline-block"
      >
        {children}
      </MenuRevealText>
    </TextRevealMask>
  );
}

interface HomePanelMobileProps {
  showContent?: boolean;
  // Render everything in its final state with no entrance animations
  instant?: boolean;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  projects?: ProjectCardData[];
}

export default function HomePanelMobile({
  showContent = true,
  instant = false,
  language = 'en',
  onLanguageChange,
  projects = [],
}: HomePanelMobileProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleSpaceRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLAnchorElement>(null);
  const {
    open: menuOpen,
    closing: menuClosing,
    setOpen: setMenuOpen,
    rootRef,
    triggerRef,
    navigationId,
    close: closeMenu,
    closeImmediately: closeMenuImmediately,
    cancelClose,
  } = useHomeMenu();
  const menuExpanded = menuOpen && !menuClosing;
  const [carryProjects, setCarryProjects] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioId = useId();
  const rolesId = useId();
  const reducedMotion = useReducedMotion();
  const compactProgress = useMotionValue(0);
  const menuHeadingOffset = useMotionValue(0);
  const menuHeadingDocumentTop = useMotionValue(0);
  const menuScrollY = useMotionValue(0);
  const menuScrollTop = useMotionValue(0);
  const menuContentOpacity = useMotionValue(1);
  const menuBioReveal = useMotionValue<BioReturnPhase>('idle');
  const bioReturnPhase = useSyncExternalStore(
    (listener) => menuBioReveal.on('change', listener),
    () => menuBioReveal.get(),
    () => 'idle' as const,
  );
  const revealBioAfterReturnRef = useRef(false);
  const bioLayoutProgress = useMotionValue(0);
  const bioNameProgress = useMotionValue(0);
  const bioSpaceProgress = useTransform(bioLayoutProgress, heroBioSpaceProgress);
  const titleBaseHeight = useMotionValue(instant ? 120 : 176);
  const retainedTitleProgress = useMotionValue(0);
  const menuSnapshotRef = useRef<{ top: number; progress: number; headingY: number } | null>(null);
  const menuNavigationRef = useRef(false);
  const [fontSize, setFontSize] = useState('96px');
  const [shrunkFontSize, setShrunkFontSize] = useState(64);
  const [containerWidth, setContainerWidth] = useState(0);
  const [firstNameWidth, setFirstNameWidth] = useState(0);
  const [hasShrunk, setHasShrunk] = useState(instant);
  const [introDone, setIntroDone] = useState(instant);
  // True once the user has changed language: changed copy then re-animates
  // with the scramble effect instead of the intro animations.
  const [langSwitched, setLangSwitched] = useState(false);
  // Language shown before the switch, so the outgoing copy stays on screen
  // until the scramble replaces it.
  const [prevLanguage, setPrevLanguage] = useState<Language>(language);
  // Left offset of the second name line, measured so the current last name
  // ends at the right edge (matches ZHAO_COLUMN_OFFSET_RATIO for "Zhao").
  const [lineOffsetRatio, setLineOffsetRatio] = useState(ZHAO_COLUMN_OFFSET_RATIO);
  const currentTime = useCurrentTime(language);
  const t = translations[language];
  const fromT = translations[prevLanguage];
  // Mobile wraps the expanded copy to its available width instead of carrying
  // the desktop's column-specific line breaks onto a narrow phone.
  const fullBio = useMemo(() => [expandedBioLines[language].join(' ')], [language]);
  const projectCount = String(projects.length);
  const { progress, headingY, headingLift, scrollToProjects, cancelScroll } = useHeroScroll({
    heroRef,
    headingRef,
    enabled: hasShrunk && showContent && projects.length > 0 && !menuOpen,
    ready: introDone,
    touchEnabled: showContent && projects.length > 0 && !menuOpen,
    trackHeroState: false,
    headingDockTop: PROJECTS_DOCK_TOP,
    fitHeroToViewport: true,
  });
  const bioExitProgress = useTransform(progress, [0, 0.4], [0, 1]);
  const { compactProgress: navigationCompactProgress, keepCompact } = useMenuHeaderHandoff({
    scrollProgress: progress,
    menuProgress: compactProgress,
    menuOpen,
    menuClosing,
    reducedMotion,
  });
  const retainedScrollProgress = useTransform(() => Math.max(progress.get(), retainedTitleProgress.get()));
  const titleProgress = useTransform(() => Math.max(retainedScrollProgress.get(), compactProgress.get(), bioNameProgress.get(), navigationCompactProgress.get()));
  // The name space contracts while the bio grows. Driving both heights with
  // one curve keeps their combined height, and Projects below, monotonic.
  const titleSpaceHeight = useTransform(() => titleBaseHeight.get() * (1 - bioSpaceProgress.get()) + 24 * bioSpaceProgress.get());
  const expandedBioTopOffset = useTransform(titleBaseHeight, (height) => 24 - height);
  // Give the return a long slowdown before its early stop. Match the slope
  // into the remaining lift so Projects still docks with the images.
  const projectsRise = useTransform(
    progress,
    [PROJECTS_RISE_START, PROJECTS_RISE_EASE_END, 1],
    [0, (PROJECTS_RISE_EASE_END - PROJECTS_RISE_START) / (1 - PROJECTS_RISE_START), 1],
    { ease: [(value) => value * value * (3 - 3 * value + value * value), (value) => value] },
  );
  const projectsHeadingY = useTransform(() => headingY.get() - headingLift.get() * projectsRise.get());
  const menuProjectsHeadingY = useTransform(() => {
    const localReveal = !carryProjects && (menuOpen || compactProgress.get() > 0);
    const carriedY = localReveal
      ? menuScrollY.get() + PROJECTS_DOCK_TOP - menuHeadingDocumentTop.get() - menuScrollTop.get()
      : projectsHeadingY.get() + (menuHeadingOffset.get() - menuScrollTop.get()) * compactProgress.get();
    // Hold the carried label at the dock while Projects navigation catches up,
    // using the same handoff that keeps the compact name in place.
    const dockedY = headingY.get() + PROJECTS_DOCK_TOP - menuHeadingDocumentTop.get() - menuScrollTop.get() * compactProgress.get();
    return carriedY + (dockedY - carriedY) * navigationCompactProgress.get();
  });
  const projectsHeadingLayer = useTransform(() => menuOpen || compactProgress.get() > 0 ? 40 : 30);
  const heroOpacity = useTransform(progress, [0, 0.7], [1, 0]);
  const menuHeroOpacity = useTransform(() => heroOpacity.get() * menuContentOpacity.get());
  const menuBioOpacity = useTransform(() => menuBioReveal.get() === 'hidden' ? 0 : menuContentOpacity.get());
  const heroVisibility = useTransform(progress, (value) => value >= 0.7 ? 'hidden' : 'visible');
  const bioVisibility = useTransform(bioExitProgress, (value) => value >= 1 ? 'hidden' : 'visible');
  const nameBlend = useTransform(retainedScrollProgress, (value) => value >= 0.7 ? 'difference' : 'normal');
  const nameColor = useTransform(retainedScrollProgress, (value) => value >= 0.7 ? '#ffffff' : 'var(--foreground)');
  const compactScale = 20 / shrunkFontSize;
  const titleScale = useTransform(titleProgress, [0, 1], [1, compactScale]);
  const nativeNameOpacity = useTransform(titleProgress, [0, 1], [1, 0]);
  const nativeNameVisibility = useTransform(nativeNameOpacity, (value) => value <= 0.001 ? 'hidden' : 'visible');
  const lastNameY = useTransform(titleProgress, [0, 1], [0, -shrunkFontSize]);
  const lastNameX = useTransform(titleProgress, [0, 1], [
    0,
    firstNameWidth + 6 / compactScale - lineOffsetRatio * containerWidth,
  ]);
  const profileOpacity = useTransform(() => heroOpacity.get() * (1 - Math.max(compactProgress.get(), bioNameProgress.get())));
  const scrollToProjectsRef = useRef(scrollToProjects);

  useLayoutEffect(() => {
    scrollToProjectsRef.current = scrollToProjects;
  }, [scrollToProjects]);

  useLayoutEffect(() => {
    if (menuOpen) return;
    const snapshot = menuSnapshotRef.current;
    if (!snapshot) return;
    menuSnapshotRef.current = null;

    if (menuNavigationRef.current) {
      menuNavigationRef.current = false;
      retainedTitleProgress.set(0);
      return;
    }

    // Restore the same visual state before the first unlocked paint. Keep the
    // compact title while the scroll observers refresh their measurements.
    scrollInstantly(snapshot.top);
    progress.set(snapshot.progress);
    headingY.set(snapshot.headingY);
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => retainedTitleProgress.set(0));
    });
    return () => cancelAnimationFrame(frame);
  }, [menuOpen, progress, headingY, retainedTitleProgress]);

  useEffect(() => {
    const revealAfterReturn = !menuExpanded && revealBioAfterReturnRef.current && !reducedMotion;
    // Keep the bio clear of the carried Projects label until the name and
    // heading have finished their shared return to the hero.
    if (revealAfterReturn) {
      menuBioReveal.set('hidden');
    } else if (!menuExpanded) {
      menuBioReveal.set('idle');
      revealBioAfterReturnRef.current = false;
    }

    const animation = animate(compactProgress, menuExpanded ? 1 : 0, {
      duration: reducedMotion ? 0 : 0.7,
      delay: revealAfterReturn ? 0.15 : 0,
      ease: [0.76, 0, 0.15, 1],
    });
    let cancelled = false;
    void animation.then(() => {
      if (cancelled || menuExpanded) return;
      setCarryProjects(true);
      if (revealAfterReturn) {
        revealBioAfterReturnRef.current = false;
        menuBioReveal.set('revealing');
      }
    });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [menuExpanded, compactProgress, menuBioReveal, reducedMotion]);

  useEffect(() => {
    const animation = animate(menuContentOpacity, menuOpen ? 0 : 1, {
      duration: reducedMotion ? 0 : 0.3,
    });
    return () => animation.stop();
  }, [menuOpen, menuContentOpacity, reducedMotion]);

  useLayoutEffect(() => {
    // The name follows the scroll snap's complete ease. The earlier spatial
    // phase belongs to the bio layout and would rush the name's contraction.
    const animation = animate(bioNameProgress, bioExpanded ? 1 : 0, {
      duration: reducedMotion ? 0 : bioExpanded ? 0.8 : 1.1,
      // On collapse, the bio clears the name's growing footprint first.
      delay: reducedMotion || bioExpanded ? 0 : BIO_NAME_RETURN_DELAY * bioLayoutProgress.get(),
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => animation.stop();
  }, [bioExpanded, bioLayoutProgress, bioNameProgress, reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion) {
      bioLayoutProgress.set(bioExpanded ? 1 : 0);
      return;
    }
    const animation = animate(bioLayoutProgress, bioExpanded ? 1 : 0, {
      ...HERO_BIO_LAYOUT_TRANSITION,
      duration: 1.45,
      delay: bioExpanded ? BIO_NAME_LEAD : 0,
    });
    return () => animation.stop();
  }, [bioExpanded, bioLayoutProgress, reducedMotion]);

  const scrollToWork = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToProjects(true);
  };

  const navigateToProjects = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    revealBioAfterReturnRef.current = false;
    keepCompact();
    menuNavigationRef.current = true;
    closeMenuImmediately();
    // Re-enable the hero scroll handlers before starting the navigation snap.
    requestAnimationFrame(() => scrollToProjectsRef.current(true));
  };

  // The globe cycles English → Swedish → Chinese
  const toggleLanguage = () => {
    setPrevLanguage(language);
    setLangSwitched(true);
    const next: Record<Language, Language> = { en: 'sv', sv: 'zh', zh: 'en' };
    onLanguageChange?.(next[language]);
  };

  // The name stacks in two lines on mobile ("Winston" / "Zhao", or
  // "Zhao" / "Sizhong" in Chinese).
  const [firstName, lastName] = t.name.split(' ');
  const [fromFirstName, fromLastName] = fromT.name.split(' ');

  useEffect(() => {
    let lastViewportWidth = window.innerWidth;
    const updateFontSize = () => {
      // Don't update if already shrunk
      if (hasShrunk) return;

      if (headerRef.current && containerRef.current) {
        const containerWidth = titleSpaceRef.current?.offsetWidth ?? containerRef.current.offsetWidth;

        // Create a temporary element to measure text width.
        // On mobile the name stacks in two lines, so fit the longest word.
        const measureEl = document.createElement('span');
        measureEl.style.visibility = 'hidden';
        measureEl.style.position = 'absolute';
        measureEl.style.whiteSpace = 'nowrap';
        measureEl.style.fontFamily = getComputedStyle(headerRef.current).fontFamily;
        measureEl.style.fontWeight = getComputedStyle(headerRef.current).fontWeight;
        measureEl.style.letterSpacing = '-0.05em';
        measureEl.textContent = 'Winston';
        document.body.appendChild(measureEl);

        // Binary search for the right font size
        let minSize = 10;
        let maxSize = 400;
        let bestSize = 96;

        for (let i = 0; i < 20; i++) {
          const testSize = (minSize + maxSize) / 2;
          measureEl.style.fontSize = `${testSize}px`;
          const textWidth = measureEl.offsetWidth;

          if (Math.abs(textWidth - containerWidth) < 1) {
            bestSize = testSize;
            break;
          } else if (textWidth < containerWidth) {
            minSize = testSize;
            bestSize = testSize;
          } else {
            maxSize = testSize;
          }
        }

        document.body.removeChild(measureEl);
        setFontSize(`${bestSize}px`);
      }
    };

    const onResize = () => {
      if (window.innerWidth === lastViewportWidth) return;
      lastViewportWidth = window.innerWidth;
      updateFontSize();
    };
    updateFontSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hasShrunk]);

  // Shrunk size: "Zhao" fills from its column offset to the right edge of
  // the page. The size is always fitted to the English name so switching
  // language never changes it; longer last names (e.g. "Sizhong") keep the
  // size and right-align by shrinking the second line's offset instead.
  // Measured before the first paint, so a page shown already shrunk (coming
  // back from a project) paints at its final size and the browser restores
  // the scroll position against the right layout.
  useLayoutEffect(() => {
    let lastViewportWidth = window.innerWidth;
    const updateShrunkFontSize = (firstPaint = false) => {
      if (!headerRef.current || !containerRef.current) return;

      const containerWidth = titleSpaceRef.current?.offsetWidth ?? containerRef.current.offsetWidth;
      // Not laid out yet — keep the previous size and offset
      if (containerWidth === 0) return;

      const targetWidth = containerWidth * (1 - ZHAO_COLUMN_OFFSET_RATIO);

      const measureEl = document.createElement('span');
      measureEl.style.visibility = 'hidden';
      measureEl.style.position = 'absolute';
      measureEl.style.whiteSpace = 'nowrap';
      measureEl.style.fontFamily = getComputedStyle(headerRef.current).fontFamily;
      measureEl.style.fontWeight = getComputedStyle(headerRef.current).fontWeight;
      measureEl.style.letterSpacing = '-0.05em';
      measureEl.textContent = 'Zhao';
      document.body.appendChild(measureEl);

      let minSize = 10;
      let maxSize = 300;
      let bestSize = 64;

      for (let i = 0; i < 20; i++) {
        const testSize = (minSize + maxSize) / 2;
        measureEl.style.fontSize = `${testSize}px`;
        const textWidth = measureEl.offsetWidth;

        if (Math.abs(textWidth - targetWidth) < 1) {
          bestSize = testSize;
          break;
        } else if (textWidth < targetWidth) {
          minSize = testSize;
          bestSize = testSize;
        } else {
          maxSize = testSize;
        }
      }

      // Right-align the current last name at that size by computing how far
      // from the left edge it has to start.
      measureEl.style.fontSize = `${bestSize}px`;
      measureEl.textContent = lastName;
      const lastNameWidth = measureEl.offsetWidth;
      measureEl.textContent = firstName;
      const firstWordWidth = measureEl.offsetWidth;

      document.body.removeChild(measureEl);
      setShrunkFontSize(bestSize);
      setContainerWidth(containerWidth);
      setFirstNameWidth(firstWordWidth);
      setLineOffsetRatio(Math.max(0, (containerWidth - lastNameWidth) / containerWidth));

      // framer-motion only applies the new size a frame later (and resets its
      // mount value in a microtask), so when the page is shown already shrunk
      // the size is also written straight to the element.
      if (firstPaint && instant) {
        const header = headerRef.current;
        header.style.fontSize = `${bestSize}px`;
        queueMicrotask(() => {
          header.style.fontSize = `${bestSize}px`;
        });
      }
    };

    const onResize = () => {
      // Safari's toolbar changes height while scrolling. Text fitting only
      // depends on width; avoid its repeated style writes and layout reads.
      if (window.innerWidth === lastViewportWidth) return;
      lastViewportWidth = window.innerWidth;
      updateShrunkFontSize();
    };
    updateShrunkFontSize(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [firstName, lastName, instant]);

  const photoSize = shrunkFontSize * PHOTO_TO_FONT_RATIO;

  // Timing configuration
  const headerAnimationDelay = 0.2; // When header starts appearing
  const shrinkDelay = 1.3; // Seconds after page load to start shrinking
  const shrinkDuration = 0.8; // Duration of shrink animation

  // Trigger shrink after delay
  useEffect(() => {
    if (!showContent || instant) return;
    const timer = setTimeout(() => {
      setHasShrunk(true);
    }, shrinkDelay * 1000);
    return () => clearTimeout(timer);
  }, [showContent, instant]);

  // Animation configuration - content appears during/after shrink
  const contentBaseDelay = 0.4; // Delay after shrink before content animates
  const stagger = 0.1;
  const bioStagger = 0.03; // Tighter stagger for bio section

  // Header section timing (initial appear animation)
  const headerDelay = headerAnimationDelay;

  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.5;
  const bioStartDelay = contentBaseDelay + bioPause;

  // Bio lines flow continuously with tight timing
  const bio1Delay = bioStartDelay;
  const bio2Delay = bioStartDelay + 2 * bioStagger;
  const bio3Delay = bioStartDelay + 6 * bioStagger;
  const bio4Delay = bioStartDelay + 10 * bioStagger;

  // Say hi and icon follow the bio
  const workDelay = bio4Delay + 4 * bioStagger;
  const iconDelay = workDelay + stagger;
  const initialsDelay = workDelay + stagger;
  const timeDelay = initialsDelay + 0.05;
  const globeDelay = contentBaseDelay + 0.1;

  useEffect(() => {
    if (instant || !showContent) return;
    const timer = setTimeout(
      () => setIntroDone(true),
      (shrinkDelay + timeDelay + 1.1) * 1000,
    );
    return () => clearTimeout(timer);
  }, [showContent, instant, shrinkDelay, timeDelay]);

  // `instant` collapses the intro shrink to zero duration when the page is
  // re-mounted after visiting /resume (the intro is skipped on the way back).
  // It must NOT also flatten the language-switch reposition — the profile photo
  // sliding across and the last-name line re-anchoring — which happens long
  // after mount. So once the user actually switches language, keep the normal
  // slide duration even when the intro was skipped.
  const shrinkTransition = {
    duration: instant && !langSwitched ? 0 : shrinkDuration,
    ease: [0.76, 0, 0.15, 1] as const,
  };

  useLayoutEffect(() => {
    const targetHeight = (hasShrunk ? shrunkFontSize : parseFloat(fontSize)) * 1.75 + 8;
    if (reducedMotion || instant && !langSwitched) {
      titleBaseHeight.set(targetHeight);
      return;
    }
    const animation = animate(titleBaseHeight, targetHeight, {
      duration: shrinkDuration,
      ease: [0.76, 0, 0.15, 1],
    });
    return () => animation.stop();
  }, [titleBaseHeight, hasShrunk, shrunkFontSize, fontSize, instant, langSwitched, reducedMotion, shrinkDuration]);

  // Scramble timing for language switches: all texts animate at once, each
  // sweeping through its own characters left to right.
  const switchCharDelay = 0.02;
  // The second name line is right-anchored during switches, so extra
  // characters ("Zhao" → "Sizhong") are added on the LEFT and the right
  // edge never leaves the page. Its sweep is held back and spread out so
  // the profile photo (0.8s slide to the page edge in Chinese) clears the
  // lane before the name grows into it.
  const lastNameSwitchDelay = 0.3;
  const lastNameSwitchCharDelay = 0.05;
  const bioIntroDelays = [bio1Delay, bio2Delay, bio3Delay, bio4Delay];

  // The Chinese version uses a lighter weight and half the tracking for the
  // large display text (per the zh Figma frame).
  const isZh = language === 'zh';
  const bigTextWeight = isZh ? 'font-light' : 'font-medium';
  const bigTextTracking = isZh ? 'tracking-[-0.64px]' : 'tracking-[-1.28px]';

  // Photo position: 12px to the left of the last name for latin layouts,
  // flush with the page's left edge for Chinese. Both values share the same
  // calc() shape so framer can tween between them.
  const photoLeft = isZh
    ? 'calc(0% + 0px)'
    : `calc(${lineOffsetRatio * 100}% + ${-(photoSize + 12)}px)`;

  useNavigationToggle({
    enabled: hasShrunk && showContent,
    progress: retainedScrollProgress,
    menuProgress: compactProgress,
    heroTop: 36,
    triggerRef,
    open: menuOpen,
    closing: menuClosing,
    navigationId,
    onClick: () => {
      if (menuClosing) cancelClose();
      else if (menuOpen) closeMenu();
      else {
        cancelScroll();
        menuSnapshotRef.current = { top: window.scrollY, progress: progress.get(), headingY: headingY.get() };
        retainedTitleProgress.set(progress.get());
        revealBioAfterReturnRef.current = progress.get() < 1;
        const headingTop = headingRef.current?.getBoundingClientRect().top ?? PROJECTS_DOCK_TOP;
        const headingDocumentTop = headingRef.current ? documentTop(headingRef.current) : PROJECTS_DOCK_TOP;
        setCarryProjects(progress.get() < 1 || (carryProjects && Math.abs(headingTop - PROJECTS_DOCK_TOP) < 2));
        menuScrollY.set(window.scrollY);
        menuHeadingDocumentTop.set(headingDocumentTop);
        menuHeadingOffset.set(window.scrollY + PROJECTS_DOCK_TOP - headingDocumentTop - projectsHeadingY.get());
        setMenuOpen(true);
      }
    },
    onHomeNavigate: closeMenuImmediately,
    instant,
    delay: globeDelay,
  });
  useNavigationNameHandoff();

  return (
    <div
      ref={rootRef}
      role={menuOpen ? 'dialog' : undefined}
      aria-modal={menuOpen ? true : undefined}
      aria-label={menuOpen ? 'Main navigation' : undefined}
      aria-owns={menuOpen ? 'site-navigation-toggle' : undefined}
      className="theme-root bg-background min-h-dvh w-full relative overflow-x-clip"
    >
      <HomeNavigationBackdrop progress={progress} mobile />
      {/* Background column guides - 2 column mobile grid (currently hidden) */}
      {SHOW_COLUMN_GUIDES && (
        <div
          className="absolute inset-y-0 inset-x-6 grid grid-cols-2 gap-x-3 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={i}
              className="border-x border-foreground/8 origin-top"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: showContent ? 1 : 0 }}
              transition={{ duration: 1.2, delay: headerAnimationDelay + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      )}

      {/* Page: the intro fills the first screen; work and footer scroll below */}
      <div className="flex flex-col gap-9 w-full">
        {/* Fit the content to the visible viewport, with blank clearance below
            Safari's floating controls. Freeze both during scrolling so work
            moves fully off screen on return without shifting the footer. */}
        <div
          ref={heroRef}
          className={`relative flex flex-col ${
            hasShrunk ? 'min-h-svh' : 'h-svh overflow-hidden'
          } shrink-0 items-start p-6 w-full`}
          style={hasShrunk ? {
            minHeight: 'var(--hero-viewport-height, 100svh)',
            marginBottom: 'var(--hero-bottom-clearance, 0px)',
          } : undefined}
        >
          <div className="flex flex-col flex-1 gap-12 items-start w-full">
            {/* Header Content */}
            <motion.div
              ref={titleSpaceRef}
              aria-hidden="true"
              className="w-full shrink-0"
              style={{ height: titleSpaceHeight }}
            />
            <motion.div
              ref={containerRef}
              className="fixed top-6 left-6 right-6 z-40 py-1 origin-top-left"
              style={{ scale: titleScale, color: menuOpen ? 'var(--foreground)' : nameColor, mixBlendMode: menuOpen ? 'normal' : nameBlend }}
            >
              <motion.h1
                ref={headerRef}
                aria-label={t.name}
                className="font-medium leading-none w-full cursor-default"
                initial={instant ? false : undefined}
                animate={{
                  fontSize: hasShrunk ? `${shrunkFontSize}px` : fontSize,
                }}
                transition={shrinkTransition}
                style={{
                  letterSpacing: '-0.05em',
                  marginTop: '-0.15em',
                  marginBottom: '-0.1em',
                }}
              >
                <span className="flex items-baseline whitespace-nowrap">
                  <span data-navigation-name="first">
                    {langSwitched ? (
                      <ScrambleText from={fromFirstName} charDelay={switchCharDelay}>
                        {firstName}
                      </ScrambleText>
                    ) : showContent ? (
                      <AnimatedText baseDelay={headerDelay} staggerDelay={stagger} instant={instant}>
                        {firstName}
                      </AnimatedText>
                    ) : (
                      <span className="opacity-0">{firstName}</span>
                    )}
                  </span>
                  {/* Chinese name at the right edge of the page (zh only),
                      sharing the "Zhao" line's baseline so the bottoms of the
                      two texts align. Also rendered without a live switch when
                      the session restored Chinese. */}
                  {(langSwitched || (t.nativeName !== '' && hasShrunk && showContent)) && (
                    <motion.span
                      className="font-light text-[12px] leading-none ml-auto"
                      style={{ letterSpacing: '-0.02em', opacity: nativeNameOpacity, visibility: nativeNameVisibility }}
                    >
                      {langSwitched ? (
                        <ScrambleText from={fromT.nativeName} charDelay={switchCharDelay}>
                          {t.nativeName}
                        </ScrambleText>
                      ) : (
                        <AnimatedText baseDelay={globeDelay} staggerDelay={stagger} instant={instant}>
                          {t.nativeName}
                        </AnimatedText>
                      )}
                    </motion.span>
                  )}
                </span>
                {/* After a language switch the line becomes a right-anchored
                    flex row: if the scrambling name is momentarily wider than
                    the padded box it overflows to the LEFT, so the right edge
                    never goes off screen while the padding tween catches up. */}
                <motion.span
                  className={`${langSwitched ? 'flex justify-end' : 'block'} whitespace-nowrap relative`}
                  initial={instant ? false : undefined}
                  animate={{
                    paddingLeft: hasShrunk ? `${lineOffsetRatio * 100}%` : '0%',
                  }}
                  transition={shrinkTransition}
                  style={{ x: lastNameX, y: lastNameY }}
                >
                  <span data-navigation-name="last" className="inline-block">
                    {langSwitched ? (
                      <ScrambleText
                        from={fromLastName}
                        align="right"
                        baseDelay={lastNameSwitchDelay}
                        charDelay={lastNameSwitchCharDelay}
                      >
                        {lastName}
                      </ScrambleText>
                    ) : showContent ? (
                      <AnimatedText baseDelay={headerDelay + stagger} staggerDelay={stagger} instant={instant}>
                        {lastName}
                      </AnimatedText>
                    ) : (
                      <span className="opacity-0">{lastName}</span>
                    )}
                  </span>

                  {/* Profile picture - appears beside "Zhao" once the name settles.
                      Always mounted (with priority) so the image is preloaded
                      during the intro, instead of popping in late. */}
                  <motion.span style={{ opacity: profileOpacity }}>
                    <motion.span
                      className="block absolute top-1/2"
                      style={{
                        width: photoSize,
                        height: photoSize,
                        marginTop: -photoSize / 2,
                      }}
                      initial={{ opacity: 0, scale: 0.8, left: photoLeft }}
                      animate={
                        hasShrunk && showContent
                          ? { opacity: 1, scale: 1, left: photoLeft }
                          : { opacity: 0, scale: 0.8, left: photoLeft }
                      }
                      transition={{
                        opacity: { duration: 0.6, delay: shrinkDuration, ease: [0.4, 0, 0.2, 1] },
                        scale: { duration: 0.6, delay: shrinkDuration, ease: [0.4, 0, 0.2, 1] },
                        // Slide in step with the name line's offset change
                        left: shrinkTransition,
                      }}
                    >
                      <Image
                        src="/profile.webp"
                        alt="Winston Zhao"
                        width={128}
                        height={128}
                        priority
                        className="w-full h-full object-cover"
                      />
                    </motion.span>
                  </motion.span>
                </motion.span>
              </motion.h1>
            </motion.div>

            {/* Bio Section */}
            <AnimatePresence>
              {hasShrunk && (
                <motion.div
                  className="flex flex-col flex-1 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  <div className="flex flex-col gap-12 w-full">
                    {/* Bio */}
                    <motion.div
                      id={bioId}
                      aria-hidden={menuOpen}
                      inert={menuOpen}
                      style={{ y: headingY, visibility: bioVisibility, opacity: menuBioOpacity }}
                      className={`${bigTextWeight} leading-none text-[32px] ${bigTextTracking} transition-[font-weight,letter-spacing] duration-700 ease-in-out cursor-default`}
                    >
                      <HeroBioWordRevealContext.Provider value={(children, order) => (
                        <MobileBioMenuRevealWord order={order} phase={bioReturnPhase} reducedMotion={!!reducedMotion}>
                          {children}
                        </MobileBioMenuRevealWord>
                      )}>
                        <MorphingBio
                          lines={t.bioLines}
                          expandedLines={fullBio}
                          expanded={bioExpanded}
                          freezeExit={false}
                          animateHeight
                          layoutProgress={bioLayoutProgress}
                          expandedParentOffset={expandedBioTopOffset}
                          progress={bioExitProgress}
                          renderLine={(line, index) => langSwitched ? (
                            <ScrambleText
                              from={fromT.bioLines[index]}
                              charDelay={switchCharDelay}
                              className="whitespace-nowrap"
                            >
                              {line}
                            </ScrambleText>
                          ) : showContent ? (
                            <AnimatedText baseDelay={bioIntroDelays[index]} staggerDelay={0.03}>
                              {line}
                            </AnimatedText>
                          ) : (
                            <span className="opacity-0">{line}</span>
                          )}
                        />
                      </HeroBioWordRevealContext.Provider>
                    </motion.div>

                    <div className="w-full">
                      {/* Work + Icon */}
                      <motion.div
                        className="relative z-30 flex gap-9 items-center justify-between w-full"
                        style={{ y: menuProjectsHeadingY, zIndex: projectsHeadingLayer }}
                      >
                        <h2>
                          <a
                            ref={headingRef}
                            href="#work"
                            data-home-menu-link={menuOpen ? '' : undefined}
                            aria-hidden={menuClosing}
                            inert={menuClosing}
                            onClick={menuOpen ? navigateToProjects : scrollToWork}
                            className={`flex h-8 gap-2 items-start ${bigTextWeight} whitespace-nowrap cursor-pointer transition-[font-weight] duration-700 ease-in-out`}
                          >
                            <motion.span
                              className={`text-reveal-mask text-[32px] leading-none ${bigTextTracking} transition-[letter-spacing] duration-700 ease-in-out`}
                              {...revealMaskAnimation(workDelay, 0.9)}
                            >
                              <TextRevealMask active={carryProjects || menuExpanded} delay={0.1} duration={0.9} instant={carryProjects || !!reducedMotion}>
                                <MenuRevealText enabled={!carryProjects} open={menuExpanded} reducedMotion={!!reducedMotion} distance="0.4em" enterDelay={0.1} exitDelay={0} className="text-reveal-word inline-block">
                              {langSwitched ? (
                                <ScrambleText from={fromT.workLabel} charDelay={switchCharDelay}>
                                  {t.workLabel}
                                </ScrambleText>
                              ) : showContent ? (
                                <motion.span
                                  className="inline-block"
                                  initial={{ y: '40%', opacity: 0 }}
                                  animate={{ y: '0%', opacity: 1 }}
                                  transition={{
                                    duration: 0.9,
                                    delay: workDelay,
                                    ease: [0.4, 0, 0.2, 1],
                                  }}
                                >
                                  {t.workLabel}
                                </motion.span>
                              ) : (
                                <span className="opacity-0">{t.workLabel}</span>
                              )}
                                </MenuRevealText>
                              </TextRevealMask>
                            </motion.span>
                            <motion.span
                              className="text-reveal-mask text-[12px] leading-normal tracking-[-0.24px]"
                              {...revealMaskAnimation(workDelay + stagger, 0.9)}
                            >
                              <TextRevealMask active={carryProjects || menuExpanded} delay={0.16} duration={0.9} instant={carryProjects || !!reducedMotion}>
                                <MenuRevealText enabled={!carryProjects} open={menuExpanded} reducedMotion={!!reducedMotion} distance="0.6em" enterDelay={0.16} exitDelay={0.03} className="text-reveal-word inline-block align-bottom">
                              {langSwitched ? (
                                <ScrambleText from={projectCount} charDelay={switchCharDelay}>
                                  {projectCount}
                                </ScrambleText>
                              ) : showContent ? (
                                <motion.span
                                  className="inline-block"
                                  initial={{ y: '40%', opacity: 0 }}
                                  animate={{ y: '0%', opacity: 1 }}
                                  transition={{
                                    duration: 0.9,
                                    delay: workDelay + stagger,
                                    ease: [0.4, 0, 0.2, 1],
                                  }}
                                >
                                  {projectCount}
                                </motion.span>
                              ) : (
                                <span className="opacity-0">{projectCount}</span>
                              )}
                                </MenuRevealText>
                              </TextRevealMask>
                            </motion.span>
                          </a>
                        </h2>
                        {showContent ? (
                          <motion.div aria-hidden={menuOpen} inert={menuOpen} style={{ opacity: menuHeroOpacity, visibility: heroVisibility }}>
                            <motion.div
                              className="w-8 h-8 shrink-0"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                duration: 0.8,
                                delay: iconDelay,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setBioExpanded((value) => !value)}
                                aria-expanded={bioExpanded}
                                aria-controls={`${bioId} ${rolesId}`}
                                aria-label={bioExpanded ? 'Collapse biography' : 'Expand biography'}
                                className="block h-full w-full cursor-pointer"
                              >
                                <motion.svg
                                  viewBox="0 0 36 36"
                                  fill="none"
                                  className="h-full w-full"
                                  animate={{ rotate: bioExpanded ? 45 : 0 }}
                                  transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.4, 0, 0.2, 1] }}
                                  aria-hidden="true"
                                >
                                  <g className={!bioExpanded && !reducedMotion ? 'animate-spin-slow' : undefined} style={{ transformOrigin: '18px 18px' }}>
                                    <path d="M0 18H36M18 0V36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  </g>
                                </motion.svg>
                              </button>
                            </motion.div>
                          </motion.div>
                        ) : (
                          <div className="w-8 h-8 shrink-0 opacity-0">
                            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="w-full h-full">
                              <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                              <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                        )}
                      </motion.div>

                      <motion.div
                        id={rolesId}
                        aria-hidden={!bioExpanded || menuOpen}
                        inert={!bioExpanded || menuOpen}
                        className="overflow-hidden w-full"
                        style={{ y: headingY, opacity: menuHeroOpacity, visibility: heroVisibility }}
                        initial={false}
                        animate={{ height: bioExpanded ? 'auto' : 0, marginTop: bioExpanded ? 48 : 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <motion.div
                          className="flex flex-col items-start gap-1.5"
                          initial={false}
                          animate={{ opacity: bioExpanded ? 1 : 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.3 }}
                        >
                          <NewlyRole label={langSwitched ? (
                            <ScrambleText from={fromT.designAt} charDelay={switchCharDelay}>
                              {t.designAt}
                            </ScrambleText>
                          ) : t.designAt} />
                          <FigmaRole label={langSwitched ? (
                            <ScrambleText from={fromT.campusLeaderAt} charDelay={switchCharDelay}>
                              {t.campusLeaderAt}
                            </ScrambleText>
                          ) : t.campusLeaderAt} />
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Initials and time - aligned along the bottom of the hero */}
                  <motion.div
                    className="flex items-end justify-between gap-5 mt-auto pt-12 w-full"
                    aria-hidden={menuOpen}
                    inert={menuOpen}
                    style={{ opacity: menuHeroOpacity, visibility: heroVisibility }}
                  >
                    <div className="w-[27px] h-[17px] shrink-0">
                      <WZLogo className="w-full h-full" draw show={showContent} instant={instant} delay={initialsDelay} />
                    </div>

                    {/* Toronto time and language globe */}
                    <motion.div
                      className="text-reveal-mask flex items-center justify-end gap-1.5 whitespace-nowrap"
                      {...revealMaskAnimation(timeDelay, 0.9)}
                    >
                      {showContent ? (
                        <motion.div
                          className="flex items-center gap-1.5"
                          initial={{ y: '40%', opacity: 0 }}
                          animate={{ y: '0%', opacity: 1 }}
                          transition={{
                            duration: 0.9,
                            delay: timeDelay,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        >
                          <span className="font-medium text-[12px] tracking-[-0.24px] leading-normal">
                            {langSwitched ? (
                              <ScrambleText from={formatTorontoTime(prevLanguage)} charDelay={switchCharDelay}>
                                {currentTime}
                              </ScrambleText>
                            ) : (
                              currentTime
                            )}
                          </span>
                          <LanguageGlobe
                            onClick={toggleLanguage}
                            className="block w-3 h-3 shrink-0 cursor-pointer"
                          />
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-1.5 opacity-0">
                          <span className="font-medium text-[12px] tracking-[-0.24px] leading-normal">{currentTime}</span>
                          <span className="w-3 h-3 shrink-0" />
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Work remains visible throughout the snap; the hero's clearance
            carries it fully below the screen before the return settles. */}
        {hasShrunk && (
          <motion.div
            className="flex flex-col gap-9 w-full"
            aria-hidden={menuOpen}
            inert={menuOpen}
            animate={{ opacity: menuOpen ? 0 : 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {projects.length > 0 && (
              <HomeProjects
                projects={projects}
                heroScrollProgress={progress}
                className="pt-12"
                introSkipped={instant}
                scrollToHashWhenReady={introDone}
                onScrollToWork={scrollToProjects}
              />
            )}

            <div className="relative flex flex-col gap-12 p-6 w-full">
              <div className="max-w-[354px] font-normal text-[12px] tracking-[-0.24px] leading-normal">
                <p className="mb-0">
                  {translations.en.newPortfolio}
                </p>
                <p>
                  {translations.en.checkBackPrefix}
                  <a
                    href={OLD_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {translations.en.oldSiteLink}
                  </a>
                  {translations.en.period}
                </p>
              </div>
              <div className="flex items-end justify-between w-full">
                <div className="w-[45px] h-[28px] shrink-0">
                  <WZLogo className="w-full h-full" />
                </div>
                <div className="flex gap-3 items-center justify-end font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">
                  <a href={`mailto:${EMAIL}`}>hello [at] winstonzhao.ca</a>
                  <Link href={RESUME_URL}>
                    {translations.en.resume}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <motion.div
        id={navigationId}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        data-home-menu-scroll
        data-lenis-prevent
        onScroll={(event) => menuScrollTop.set(event.currentTarget.scrollTop)}
        className="fixed inset-0 z-[35] overflow-y-auto overscroll-contain bg-background px-6 pb-12 pt-44 text-foreground"
        initial={false}
        animate={{ opacity: menuOpen ? 1 : 0 }}
        style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <HomeMenuLinks
          language={language}
          projectCount={projectCount}
          open={menuOpen && !menuClosing}
          onNavigate={closeMenu}
          onProjects={navigateToProjects}
          className="gap-12"
          showProjects={false}
          revealIndexOffset={1}
        />
      </motion.div>
    </div>
  );
}
