'use client';

import { animate, motion, AnimatePresence, cubicBezier, useAnimationControls, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatedText,
  ScrambleText,
  formatTorontoTime,
  useCurrentTime,
  NewlyRole,
  FigmaRole,
  WZLogo,
  LanguageGlobe,
  OLD_SITE_URL,
  RESUME_URL,
  EMAIL,
} from './shared';
import { Language, translations } from './translations';
import HomeProjects from '@/components/projects/HomeProjects';
import CursorPreview, { useCursorPreview } from '@/components/projects/CursorPreview';
import type { ProjectCardData } from '@/components/projects/types';
import { useHeroScroll } from './useHeroScroll';
import HomeNavigationBackdrop from './HomeNavigationBackdrop';
import MorphingBio, { HERO_BIO_LAYOUT_TRANSITION } from './MorphingBio';
import { expandedBioLines } from './bio-copy';
import HomeMenuLinks, { MenuRevealText } from './HomeMenuLinks';
import TextRevealMask from './TextRevealMask';
import { useNavigationNameHandoff, useNavigationNameHoverBlock, useNavigationToggle } from '@/components/NavigationProvider';
import { useHomeMenu, useMenuHeaderHandoff } from './useHomeMenu';
import { revealMaskAnimation } from './text-reveal';

interface HomePanelProps {
  showContent?: boolean;
  // Render everything in its final state with no entrance animations
  instant?: boolean;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  projects?: ProjectCardData[];
}

// Vertical column guides are hidden in the current design.
// Flip this back to true to restore them.
const SHOW_COLUMN_GUIDES = false;

const NAME_SHRINK_DURATION = 0.8;
const NAME_SHRINK_STAGGER = 0.06;
const NAME_SHRINK_EASE = [0.76, 0, 0.15, 1] as const;
const NAME_SCROLL_SPRING = {
  stiffness: 60,
  damping: 22,
  mass: 1,
  restDelta: 0.001,
  restSpeed: 0.01,
};
const NAME_SCROLL_STAGGER = NAME_SHRINK_STAGGER / (NAME_SHRINK_DURATION + NAME_SHRINK_STAGGER);
const nameShrinkEase = cubicBezier(...NAME_SHRINK_EASE);
// Begin contracting immediately while retaining the intro's easing shape.
const nameScrollEase = (value: number) => 0.25 * value + 0.75 * nameShrinkEase(value);

// Split the display name into its leading word and the rest so the two can
// shrink on a stagger. A single-word name keeps everything in the first slot.
const splitName = (name: string): [string, string] => {
  const i = name.indexOf(' ');
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
};

// Size of the shrunk header name: 128px on normal laptop sizes, much smaller
// in the cramped range between mobile and lg, and growing past a 16" MacBook
// (1728px).
const shrunkHeaderSize = (width: number) => {
  const breakpoint = 1728;
  const baseSize = 128;
  // How aggressively the header grows past the breakpoint (1 = linear with
  // width; higher = grows faster on large displays).
  const growthFactor = 2;
  if (width < 1024) return '72px';
  if (width > breakpoint) {
    return `${baseSize + ((width - breakpoint) / breakpoint) * baseSize * growthFactor}px`;
  }
  return `${baseSize}px`;
};

type HoverKey = 'name' | 'stockholm' | 'newly';

// Hovering the name or a highlighted bio word shows a photo beside the cursor
// that trails it, the same way hovering a row of the project list does (on
// devices with a mouse or trackpad). Sizes are the Figma frames'.
const HOVER_IMAGES: ReadonlyArray<{ key: HoverKey; src: string; width: number; height: number }> = [
  { key: 'name', src: '/profile.webp', width: 154, height: 154 },
  { key: 'stockholm', src: '/stockholm.webp', width: 237, height: 316 },
  { key: 'newly', src: '/newlygraphic.avif', width: 390, height: 230 },
];

// Bio lines (by index) that carry a hover word, with the matching word per
// language so the highlight follows a language switch.
const HOVER_BIO_WORDS: Record<number, { key: HoverKey; word: Record<Language, string> }> = {
  2: { key: 'stockholm', word: { en: 'toronto', sv: 'toronto', zh: '多伦多' } },
  3: { key: 'newly', word: { en: 'ocad', sv: 'ocad', zh: 'OCAD' } },
};

// After a language switch the keyword lines render as one unit so the full-line
// scramble plays; once it settles they swap to their static, hoverable form.
const SCRAMBLE_SETTLE_MS = 1100;

export default function HomePanel({
  showContent = true,
  instant = false,
  language = 'en',
  onLanguageChange,
  projects = [],
}: HomePanelProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const nameButtonRef = useRef<HTMLButtonElement>(null);
  const lastNameRef = useRef<HTMLSpanElement>(null);
  const lastNameOffset = useMotionValue(0);
  const [fontSize, setFontSize] = useState('220.84px');
  // A page shown already shrunk (`instant`) only ever mounts on the client
  // (coming back from another page), so it can start at the final size and
  // paint the right layout first; the browser then lands on #work or restores
  // the scroll position against it.
  const [shrunkFontSize, setShrunkFontSize] = useState(() =>
    instant && typeof window !== 'undefined' ? shrunkHeaderSize(window.innerWidth) : '128px',
  );
  const [hasShrunk, setHasShrunk] = useState(instant);
  // True once the user has changed language: changed copy then re-animates
  // with the scramble effect instead of the intro animations.
  const [langSwitched, setLangSwitched] = useState(false);
  // Language shown before the switch, so the outgoing copy stays on screen
  // until the scramble replaces it.
  const [prevLanguage, setPrevLanguage] = useState<Language>(language);
  // Hover only becomes active once the intro has finished playing, so nothing
  // pops up mid-animation while the page is still loading in.
  const [introDone, setIntroDone] = useState(instant);
  // False while a language-switch scramble is playing, so the keyword bio lines
  // stay rendered as one scrambling unit until it settles.
  const [scrambleSettled, setScrambleSettled] = useState(true);
  const currentTime = useCurrentTime(language);
  const t = translations[language];
  const fromT = translations[prevLanguage];
  const projectCount = String(projects.length);
  const [menuFromHero, setMenuFromHero] = useState(true);
  const { open: menuOpen, closing: menuClosing, setOpen: setMenuOpen, rootRef, triggerRef, navigationId, close: closeMenu, closeImmediately, cancelClose } = useHomeMenu({ exitDuration: menuFromHero ? HERO_BIO_LAYOUT_TRANSITION.duration * 1000 : 700 });
  const [carryProjects, setCarryProjects] = useState(true);
  const revealMenuProjects = menuOpen && !menuFromHero && !carryProjects;
  const projectsReveal = useAnimationControls();
  const closingProgress = useMotionValue(0);
  const menuProgress = useMotionValue(0);
  const menuNameProgress = useMotionValue(0);
  const menuActive = useSyncExternalStore(
    (listener) => menuProgress.on('change', listener),
    () => menuProgress.get() > 0.001,
    () => false,
  );
  const menuScrollY = useMotionValue(0);
  const menuBioScaleTarget = useMotionValue(1);
  const menuBioScale = useTransform(() => menuOpen && !menuFromHero
    ? menuBioScaleTarget.get() : 1 + (menuBioScaleTarget.get() - 1) * menuProgress.get());
  const bioRef = useRef<HTMLDivElement>(null);
  const menuFooterY = useMotionValue(0);
  const rolesY = useTransform(() => menuOpen && !menuFromHero ? menuFooterY.get() : 0);
  const rolesRef = useRef<HTMLDivElement>(null);
  const { progress, headingY, projectsHeadingY, isAtHero, scrollToProjects, scrollToHero, cancelScroll } = useHeroScroll({
    heroRef,
    headingRef,
    enabled: hasShrunk && showContent && projects.length > 0 && !menuOpen,
    ready: introDone,
    touchEnabled: showContent && projects.length > 0 && !menuOpen,
  });
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const returningToHero = menuFromHero && menuClosing;
    const transition = menuFromHero && menuOpen ? HERO_BIO_LAYOUT_TRANSITION : { duration: 0.8, ease: NAME_SHRINK_EASE };
    const animation = animate(menuProgress, menuOpen && !returningToHero ? 1 : 0, {
      ...transition,
      duration: reducedMotion ? 0 : transition.duration,
    });
    return () => animation.stop();
  }, [menuOpen, menuClosing, menuFromHero, menuProgress, reducedMotion]);
  const menuNameExpanded = menuOpen && !(menuFromHero && menuClosing);
  useEffect(() => {
    // Follow the same timing as the scroll snap, independently of the bio.
    const animation = animate(menuNameProgress, menuNameExpanded ? 1 : 0, {
      duration: reducedMotion ? 0 : menuNameExpanded ? 0.8 : 1.1,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => animation.stop();
  }, [menuNameExpanded, menuNameProgress, reducedMotion]);
  useLayoutEffect(() => {
    if (!menuOpen) {
      projectsReveal.set({ opacity: 1, y: 0, filter: 'blur(0px)' });
      return;
    }
    if (menuClosing) {
      if (!carryProjects && menuFromHero) void projectsReveal.start({ opacity: 0, y: -16, filter: 'blur(5px)', transition: { duration: reducedMotion ? 0 : 0.32 } });
      const exit = animate(closingProgress, 1, { duration: reducedMotion ? 0 : 0.32 });
      return () => exit.stop();
    }
    closingProgress.set(0);
    if (!carryProjects && menuFromHero) {
      projectsReveal.set({ opacity: 0, y: 16, filter: 'blur(5px)' });
      void projectsReveal.start({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: reducedMotion ? 0 : 0.9, ease: [0.4, 0, 0.2, 1] } });
    } else projectsReveal.set({ opacity: 1, y: 0, filter: 'blur(0px)' });
  }, [menuOpen, menuClosing, menuFromHero, carryProjects, projectsReveal, closingProgress, reducedMotion]);
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const fitBio = () => {
      const fontSize = bioRef.current ? parseFloat(getComputedStyle(bioRef.current).fontSize) : 64;
      const available = window.innerHeight - parseFloat(shrunkFontSize) - 72 - 112;
      menuBioScaleTarget.set(Math.min(1, Math.max(24, available / 8) / fontSize));
    };
    fitBio();
    window.addEventListener('resize', fitBio);
    return () => window.removeEventListener('resize', fitBio);
  }, [menuOpen, shrunkFontSize, menuBioScaleTarget]);
  const toggleMenu = () => {
    if (menuClosing) { cancelClose(); return; }
    if (menuOpen) { closeMenu(); return; }
    cancelScroll();
    preview.hide();
    menuScrollY.set(window.scrollY);
    setMenuFromHero(isAtHero);
    const projectsAtMenuPosition = Math.abs((headingRef.current?.getBoundingClientRect().top ?? 0) - parseFloat(shrunkFontSize) - 72) < 2;
    setCarryProjects(projectsAtMenuPosition);
    if (!projectsAtMenuPosition && isAtHero) projectsReveal.set({ opacity: 0, y: 16, filter: 'blur(5px)' });
    else projectsReveal.set({ opacity: 1, y: 0, filter: 'blur(0px)' });
    if (rolesRef.current) {
      const rect = rolesRef.current.getBoundingClientRect();
      const currentY = new DOMMatrixReadOnly(getComputedStyle(rolesRef.current).transform).m42;
      menuFooterY.set(currentY + window.innerHeight - 36 - rect.bottom);
    }
    setMenuOpen(true);
  };
  const currentScrollToProjects = useRef(scrollToProjects);
  useLayoutEffect(() => { currentScrollToProjects.current = scrollToProjects; }, [scrollToProjects]);
  const menuHeadingY = useTransform(() => menuOpen && !menuFromHero ? menuScrollY.get() : projectsHeadingY.get());
  const menuBioY = useTransform(() => menuOpen && !menuFromHero ? menuScrollY.get() : headingY.get());
  // Give the name time to follow the scroll instead of compressing its
  // stagger into the scroll snap's fast opening movement.
  const smoothNameProgress = useSpring(progress, NAME_SCROLL_SPRING);
  const smoothMenuNameProgress = useSpring(menuNameProgress, NAME_SCROLL_SPRING);
  const nameProgress = reducedMotion ? progress : smoothNameProgress;
  const menuHeaderProgress = reducedMotion ? menuNameProgress : smoothMenuNameProgress;
  const { compactProgress: navigationCompactProgress, keepCompact } = useMenuHeaderHandoff({
    scrollProgress: progress,
    nameProgress,
    menuProgress: menuHeaderProgress,
    menuOpen,
    menuClosing,
    reducedMotion,
  });
  useLayoutEffect(() => {
    const syncName = () => smoothNameProgress.jump(progress.get());
    syncName();
    if (!instant) return;
    // Browser Back can restore scrolling after mount. Seed the final size
    // during the same follow-up frames that measure the restored layout.
    let followupFrame = 0;
    const frame = requestAnimationFrame(() => {
      syncName();
      followupFrame = requestAnimationFrame(syncName);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(followupFrame);
    };
  }, [progress, smoothNameProgress, reducedMotion, instant]);
  const compactNameScale = 24 / parseFloat(shrunkFontSize);
  // Reuse the intro's word stagger within the scroll range. Both
  // words land exactly at either endpoint, including restored scroll positions.
  const compactProgress = useTransform(() => Math.max(nameProgress.get(), menuHeaderProgress.get(), navigationCompactProgress.get()));
  const nameScale = useTransform(compactProgress, [0, 1 - NAME_SCROLL_STAGGER], [1, compactNameScale], {
    ease: nameScrollEase,
  });
  const lastNameScale = useTransform(compactProgress, [NAME_SCROLL_STAGGER, 1], [1, compactNameScale], {
    ease: nameScrollEase,
  });
  const nativeNameOpacity = useTransform(nameScale, [1, compactNameScale], [1, 0]);
  const nativeNameVisibility = useTransform(nativeNameOpacity, (value) => value <= 0.001 ? 'hidden' : 'visible');
  const lastNameRelativeScale = useTransform(() => lastNameScale.get() / nameScale.get());
  // Compensate for the parent's leading scale so Zhao's position trails its
  // size, just as both do during the initial layout animation.
  const lastNameX = useTransform(() => lastNameOffset.get() * (lastNameRelativeScale.get() - 1));
  const navigationColor = useTransform(() => menuOpen || progress.get() >= 0.7 ? 'var(--navigation-name-color, var(--navigation-foreground))' : 'var(--foreground)');
  const heroOpacity = useTransform(progress, [0, 0.65, 1], [1, 0, 0]);
  const heroVisibility = useTransform(progress, (value) => value >= 0.65 ? 'hidden' : 'visible');
  const bioVisibility = useTransform(progress, (value) => value >= 1 ? 'hidden' : 'visible');
  const bioPointerEvents = useTransform(progress, (value) => value > 0 ? 'none' : 'auto');
  const cornerLinksOpacity = useTransform(() => heroOpacity.get() * (1 - menuProgress.get()));
  // Keep the hero footer in place throughout its bio expansion and return.
  // The menu only reveals and dismisses this row when opened after scrolling.
  const menuRolesOpacity = useTransform(() => menuOpen && !menuFromHero
    ? menuClosing ? 1 - closingProgress.get() : menuProgress.get()
    : heroOpacity.get());
  const menuRolesBlur = useTransform(() => menuOpen && !menuFromHero && menuClosing ? `blur(${closingProgress.get() * 5}px)` : 'blur(0px)');

  // Hover (and the weight crossfade) turns on once the intro has played; after a
  // language switch it waits for the full-line scramble to settle first.
  const interactive = introDone && (!langSwitched || scrambleSettled);

  // The photo that follows the cursor while the name or a bio word is hovered
  const preview = useCursorPreview();
  const nameHoverBlockedRef = useNavigationNameHoverBlock();

  const hidePreview = useEffectEvent(() => preview.hide());
  useEffect(() => {
    if (!isAtHero) hidePreview();
  }, [isAtHero]);

  const beginHover = (key: HoverKey, e: React.MouseEvent) => {
    if (!isAtHero || (key === 'name' && nameHoverBlockedRef?.current)) return;
    const { width, height } = HOVER_IMAGES.find((img) => img.key === key)!;
    preview.show(key, e, { width, height });
  };

  const moveHover = preview.move;
  const endHover = preview.hide;

  useLayoutEffect(() => {
    const button = nameButtonRef.current;
    if (!button) return;
    const measureName = () => lastNameOffset.set(lastNameRef.current?.offsetLeft ?? 0);
    measureName();
    const observer = new ResizeObserver(measureName);
    observer.observe(button);
    if (button.firstElementChild) observer.observe(button.firstElementChild);
    return () => observer.disconnect();
  }, [lastNameOffset]);

  const handleLanguageChange = (lang: Language) => {
    if (lang === language) return;
    // (the hovered word re-renders mid-switch and can't report the leave)
    preview.hide();
    setPrevLanguage(language);
    setLangSwitched(true);
    setScrambleSettled(false);
    onLanguageChange?.(lang);
  };

  // The globe beside the time cycles English → Swedish → Chinese
  const cycleLanguage = () => {
    const next: Record<Language, Language> = { en: 'sv', sv: 'zh', zh: 'en' };
    handleLanguageChange(next[language]);
  };

  const scrollToWork = (e: React.MouseEvent) => {
    e.preventDefault();
    if (menuOpen) {
      keepCompact();
      closeImmediately();
      requestAnimationFrame(() => currentScrollToProjects.current(true));
      return;
    }
    scrollToProjects(true);
  };

  // Re-arm the "scramble settled" flag after each language change so the
  // keyword lines return to their hoverable split form once the sweep ends.
  useEffect(() => {
    if (!langSwitched) return;
    const timer = setTimeout(() => setScrambleSettled(true), SCRAMBLE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [language, langSwitched]);

  useEffect(() => {
    const updateFontSize = () => {
      // Don't update if already shrunk
      if (hasShrunk) return;

      if (headerRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const text = headerRef.current.textContent || '';

        // Create a temporary element to measure text width
        const measureEl = document.createElement('span');
        measureEl.style.visibility = 'hidden';
        measureEl.style.position = 'absolute';
        measureEl.style.whiteSpace = 'nowrap';
        measureEl.style.fontFamily = getComputedStyle(headerRef.current).fontFamily;
        measureEl.style.fontWeight = getComputedStyle(headerRef.current).fontWeight;
        measureEl.style.letterSpacing = '-0.05em';
        measureEl.textContent = text;
        document.body.appendChild(measureEl);

        // Binary search for the right font size
        let minSize = 10;
        let maxSize = 500;
        let bestSize = 220.84;

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

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, [hasShrunk]);

  // Scale the shrunk header up on screens larger than a 16" MacBook (1728px),
  // keeping 128px as the floor for normal laptop sizes.
  useEffect(() => {
    const updateShrunkFontSize = () => setShrunkFontSize(shrunkHeaderSize(window.innerWidth));
    updateShrunkFontSize();
    window.addEventListener('resize', updateShrunkFontSize);
    return () => window.removeEventListener('resize', updateShrunkFontSize);
  }, []);

  // Timing configuration
  const headerAnimationDelay = 0.2; // When header starts appearing
  const shrinkDelay = 1.3; // Seconds after page load to start shrinking
  const shrinkDuration = NAME_SHRINK_DURATION;
  const nameStagger = NAME_SHRINK_STAGGER;

  // True once the staggered name shrink has fully played out. The name words
  // use framer layout (FLIP) animations so position and scale stagger
  // together; layout is switched off afterwards so later width changes
  // (language scrambles, resizes) don't replay the slow shrink ease.
  const [nameShrinkDone, setNameShrinkDone] = useState(instant);

  // Trigger shrink after delay
  useEffect(() => {
    if (!showContent || instant) return;
    const timer = setTimeout(() => {
      setHasShrunk(true);
    }, shrinkDelay * 1000);
    const doneTimer = setTimeout(() => {
      setNameShrinkDone(true);
    }, (shrinkDelay + shrinkDuration + nameStagger) * 1000 + 100);
    return () => {
      clearTimeout(timer);
      clearTimeout(doneTimer);
    };
  }, [showContent, instant, shrinkDuration, nameStagger]);

  // Animation configuration - content appears during/after shrink
  const contentBaseDelay = 0.4; // Delay after shrink before content animates
  const stagger = 0.1;
  const bioStagger = 0.03; // Tighter stagger for bio section

  // Header section timing (initial appear animation)
  const headerDelay = headerAnimationDelay;

  // Everything else animates relative to when shrink happens
  const workDelay = contentBaseDelay;

  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.5;
  const bioStartDelay = workDelay + 2 * stagger + bioPause;

  // Bio lines flow continuously with tight timing
  const bio1Delay = bioStartDelay;
  const bio2Delay = bioStartDelay + 2 * bioStagger;
  const bio3Delay = bioStartDelay + 6 * bioStagger;
  const bio4Delay = bioStartDelay + 10 * bioStagger;

  // Icon and roles appear after bio
  const iconDelay = bio4Delay;
  const rolesDelay = bio4Delay + 4 * bioStagger;
  const timeDelay = rolesDelay + 0.05;
  const languagesDelay = contentBaseDelay + 0.1;
  const footerDelay = rolesDelay + 0.1;

  // Enable hover once every intro animation has settled. Content animates
  // relative to the shrink (shrinkDelay after load); the last reveal is the
  // time/roles clip (~timeDelay + 0.5s reveal + 0.5s delay), plus a buffer.
  // (When instant, introDone already starts true, so no timer is needed.)
  useEffect(() => {
    if (instant || !showContent) return;
    const timer = setTimeout(
      () => setIntroDone(true),
      (shrinkDelay + timeDelay + 1.1) * 1000,
    );
    return () => clearTimeout(timer);
  }, [showContent, instant, shrinkDelay, timeDelay]);

  // The work section's scroll reveals start when the footer fades in, so a
  // project already on screen doesn't appear before the bio has finished.
  const [workRevealReady, setWorkRevealReady] = useState(instant);
  useEffect(() => {
    if (instant || !hasShrunk) return;
    const timer = setTimeout(() => setWorkRevealReady(true), footerDelay * 1000);
    return () => clearTimeout(timer);
  }, [instant, hasShrunk, footerDelay]);

  const shrinkTransition = {
    duration: instant ? 0 : shrinkDuration,
    ease: NAME_SHRINK_EASE,
  };

  // The name shrinks in two pieces: the first name leads and the last name
  // follows a beat later. The delay only applies once the shrink fires so the
  // pre-shrink fit-to-width sizing stays in sync across both words.
  const lastNameShrinkTransition = {
    ...shrinkTransition,
    delay: instant || !hasShrunk ? 0 : nameStagger,
  };

  // Scramble timing for language switches: all texts animate at once, each
  // sweeping through its own characters left to right.
  const switchCharDelay = 0.02;
  const bioIntroDelays = [bio1Delay, bio2Delay, bio3Delay, bio4Delay];

  // Renders one bio line. While the intro / language-switch animation is still
  // playing, the whole line renders as one unit so the original word stagger
  // and full-line scramble are untouched. Once it settles, keyword lines swap
  // to a static split so the keyword can carry its own hover handlers (the swap
  // is seamless — identical glyphs).
  const renderBioLine = (line: string, index: number, fromLine: string) => {
    const config = HOVER_BIO_WORDS[index];
    const word = config ? config.word[language] : undefined;
    const hasWord = !!config && !!word && line.includes(word);

    if (!hasWord || !interactive) {
      return langSwitched ? (
        <ScrambleText from={fromLine} charDelay={switchCharDelay}>
          {line}
        </ScrambleText>
      ) : showContent ? (
        <AnimatedText baseDelay={bioIntroDelays[index]} staggerDelay={0.03} instant={instant}>
          {line}
        </AnimatedText>
      ) : (
        <span className="opacity-0">{line}</span>
      );
    }

    const key = config!.key;
    const [before, after] = line.split(word!);
    // Keep the word indices continuous across the hoverable keyword, so its
    // scroll exit stays in sequence with the rest of the line.
    const keywordOffset = before.split(' ').length - 1;
    const seg = (text: string, wordOffset = 0) =>
      <AnimatedText instant wordOffset={wordOffset}>{text}</AnimatedText>;
    return (
      <>
        {seg(before)}
        <span
          onMouseEnter={(e) => beginHover(key, e)}
          onMouseMove={moveHover}
          onMouseLeave={endHover}
        >
          {seg(word!, keywordOffset)}
        </span>
        {after && seg(after, keywordOffset + 1)}
      </>
    );
  };

  const [firstName, lastName] = splitName(t.name);
  const [fromFirstName, fromLastName] = splitName(fromT.name);

  // Renders one word of the header name with the same intro / scramble /
  // hidden branches the full name used. The scramble sweep offsets the second
  // word by the first word's characters so the sweep still reads as one pass.
  const namePart = (text: string, fromText: string, wordIndex: number) =>
    langSwitched ? (
      <ScrambleText
        from={fromText}
        baseDelay={wordIndex === 0 ? 0 : (firstName.length + 1) * switchCharDelay}
        charDelay={switchCharDelay}
      >
        {text}
      </ScrambleText>
    ) : showContent ? (
      <AnimatedText baseDelay={headerDelay + wordIndex * stagger} staggerDelay={stagger} instant={instant}>
        {text}
      </AnimatedText>
    ) : (
      <span className="opacity-0">{text}</span>
    );

  // Short labels (roles, nav) render as plain text until a language switch,
  // then scramble.
  const roleLabel = (text: string, fromText: string) =>
    langSwitched ? (
      <ScrambleText from={fromText} charDelay={switchCharDelay}>
        {text}
      </ScrambleText>
    ) : (
      text
    );

  // The Chinese version uses a lighter weight and half the tracking for the
  // large display text (per the zh Figma frame).
  const isZh = language === 'zh';
  const bigTextWeight = isZh ? 'font-light' : 'font-medium';
  const bigTextTracking = isZh
    ? 'tracking-[-0.8px] lg:tracking-[-1.04px] xl:tracking-[-1.28px]'
    : 'tracking-[-1.6px] lg:tracking-[-2.08px] xl:tracking-[-2.56px]';

  useNavigationToggle({
    enabled: hasShrunk && showContent,
    progress,
    menuProgress,
    heroTop: parseFloat(shrunkFontSize) + 72,
    triggerRef,
    open: menuOpen,
    closing: menuClosing,
    navigationId,
    onClick: toggleMenu,
    onHomeNavigate: closeImmediately,
    instant,
    delay: iconDelay,
  });
  useNavigationNameHandoff();

  return (
    <div ref={rootRef} role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen ? true : undefined} aria-label={menuOpen ? 'Main navigation' : undefined} aria-owns={menuOpen ? 'site-navigation-toggle' : undefined} className="theme-root bg-background flex flex-col min-h-screen w-full relative overflow-x-clip">
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-10 bg-background"
        initial={false}
        // Hidden once closed so iPad Safari stops painting the menu colour
        // under its bars (see HomePanelMobile).
        animate={{ opacity: menuOpen ? 1 : 0, visibility: menuOpen ? 'visible' : 'hidden' }}
        transition={{ duration: reducedMotion ? 0 : 0.4 }}
        style={{ pointerEvents: menuOpen ? 'auto' : 'none' }}
      />
      {/* Background column guides - same grid as the page content (currently hidden) */}
      {SHOW_COLUMN_GUIDES && (
        <div
          className="absolute inset-y-0 inset-x-9 grid grid-cols-5 gap-x-6 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }).map((_, i) => (
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

      {/* Photos for the name and the highlighted bio words, shown beside
          the cursor while they're hovered */}
      <CursorPreview
        preview={preview}
        zIndex={70}
        images={HOVER_IMAGES.map((img) => ({
          key: img.key,
          content: <Image src={img.src} alt="" width={img.width} height={img.height} loading="eager" />,
        }))}
      />

      {!menuOpen && <HomeNavigationBackdrop progress={progress} />}

      {/* A stable viewport keeps the scroll target independent of name scaling. */}
      <div ref={heroRef} className="relative flex flex-col items-start p-9 min-h-svh w-full">
        <div className="flex flex-1 flex-col gap-9 items-start w-full">
          <motion.div
            aria-hidden="true"
            className="w-full shrink-0"
            initial={instant ? false : undefined}
            animate={{ height: hasShrunk ? shrunkFontSize : fontSize }}
            transition={shrinkTransition}
          />
          {/* Header Content */}
          <motion.div
            ref={containerRef}
            className="fixed top-9 left-9 right-9 z-50 flex items-start justify-between pointer-events-none"
            initial={instant ? false : undefined}
            animate={{
              height: hasShrunk ? shrunkFontSize : 'auto',
            }}
            transition={shrinkTransition}
          >
            <motion.div data-navigation-contrast="name" className="navigation-color-fade flex gap-4 items-start pointer-events-auto" style={{ scale: nameScale, transformOrigin: 'top left', color: navigationColor }}>
              {/* The font size snaps to its target and each word FLIPs from
                  its previous box via the layout prop, so the last name's
                  position and scale can trail the first name's together. */}
              <h1
                ref={headerRef}
                aria-label={t.name}
                className="font-medium whitespace-nowrap leading-none"
                style={{
                  letterSpacing: '-0.05em',
                  marginTop: '-0.15em',
                  marginBottom: '-0.1em',
                  fontSize: hasShrunk ? shrunkFontSize : fontSize,
                  paddingTop: hasShrunk ? '8px' : '0px',
                }}
              >
                <button
                  ref={nameButtonRef}
                  type="button"
                  data-navigation-name-trigger
                  tabIndex={isAtHero || menuOpen ? -1 : 0}
                  aria-disabled={isAtHero || menuOpen}
                  aria-label={isAtHero ? t.name : `${t.name} — Back to top`}
                  onClick={() => {
                    if (isAtHero || menuOpen) return;
                    preview.hide();
                    scrollToHero();
                  }}
                  onMouseEnter={(e) => {
                    if (interactive) beginHover('name', e);
                  }}
                  onMouseMove={moveHover}
                  onMouseLeave={endHover}
                  className={`relative text-left ${isAtHero ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <motion.span
                    layout={!nameShrinkDone}
                    data-navigation-name="first"
                    className="inline-block align-top"
                    transition={shrinkTransition}
                  >
                    {namePart(firstName, fromFirstName, 0)}
                  </motion.span>
                  {lastName && (
                    <>
                      {' '}
                      <motion.span
                        ref={lastNameRef}
                        className="inline-block align-top"
                        style={{ x: lastNameX, scale: lastNameRelativeScale, transformOrigin: 'top left' }}
                      >
                        <motion.span
                          layout={!nameShrinkDone}
                          data-navigation-name="last"
                          className="inline-block align-top"
                          transition={lastNameShrinkTransition}
                        >
                          {namePart(lastName, fromLastName, 1)}
                        </motion.span>
                      </motion.span>
                    </>
                  )}
                </button>
              </h1>

              {/* Chinese name beside the header (zh only). Also rendered
                  without a live switch when the session restored Chinese.
                  Sits outside the h1 so its top lines up with the language
                  switcher rather than the name's overshooting line box. */}
              {(langSwitched || (t.nativeName !== '' && hasShrunk && showContent)) && (
                <motion.span
                  className="font-light text-[20px] leading-none"
                  style={{ letterSpacing: '-0.02em', opacity: nativeNameOpacity, visibility: nativeNameVisibility }}
                >
                  <ScrambleText from={fromT.nativeName} charDelay={switchCharDelay}>
                    {t.nativeName}
                  </ScrambleText>
                </motion.span>
              )}
            </motion.div>

            {/* Navigation remains in the corner throughout the scroll. */}
            <AnimatePresence>
              {hasShrunk && showContent && (
                <motion.div
                  className="font-normal text-[14px] tracking-[-0.28px] whitespace-nowrap leading-[1.2] pointer-events-auto"
                  initial={instant ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: languagesDelay,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <motion.nav aria-label="Contact and resume" aria-hidden={menuOpen} inert={menuOpen} className="flex items-center gap-4" style={{ opacity: cornerLinksOpacity, visibility: heroVisibility }}>
                    <a href={`mailto:${EMAIL}`} className="hover:underline">{roleLabel(t.navContact, fromT.navContact)}</a>
                    <Link href={RESUME_URL} className="hover:underline">{roleLabel(t.navResume, fromT.navResume)}</Link>
                  </motion.nav>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bio Section */}
          <AnimatePresence>
            {hasShrunk && (
              <motion.div
                className="flex flex-1 flex-col justify-between gap-12 w-full"
                initial={instant ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Work and Bio - 3 column grid (5 columns below lg) */}
                <div className="grid grid-cols-5 lg:grid-cols-3 gap-x-6 w-full">
                  {/* Column 1: Work Link */}
                  <motion.div ref={headingRef} className="relative z-20 col-span-1 self-start" style={{ y: menuHeadingY }}>
                    <motion.h2 initial={false} animate={projectsReveal}>
                    <a
                      href="#work"
                      data-home-menu-link={menuOpen ? '' : undefined}
                      onClick={scrollToWork}
                      className={`flex gap-2 items-start ${bigTextWeight} whitespace-nowrap cursor-pointer transition-[font-weight] duration-700 ease-in-out`}
                    >
                      <motion.span
                        className={`text-reveal-mask text-[40px] lg:text-[52px] xl:text-[64px] leading-none ${bigTextTracking} transition-[letter-spacing] duration-700 ease-in-out`}
                        {...revealMaskAnimation(workDelay, 0.9, instant)}
                      >
                        <TextRevealMask active={!revealMenuProjects || !menuClosing} delay={0.1} duration={0.9} instant={!revealMenuProjects || !!reducedMotion}>
                          <MenuRevealText enabled={revealMenuProjects} open={!menuClosing} reducedMotion={!!reducedMotion} distance="0.4em" enterDelay={0.1} exitDelay={0} className="text-reveal-word inline-block">
                            {langSwitched ? (
                              <ScrambleText from={fromT.workLabel} charDelay={switchCharDelay}>
                                {t.workLabel}
                              </ScrambleText>
                            ) : showContent ? (
                              <motion.span
                                className="inline-block"
                                initial={instant ? false : { y: '40%', opacity: 0 }}
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
                        className="text-reveal-mask text-[13px] lg:text-[16px] xl:text-[20px] leading-normal tracking-[-0.26px] lg:tracking-[-0.32px] xl:tracking-[-0.4px]"
                        {...revealMaskAnimation(workDelay + stagger, 0.9, instant)}
                      >
                        <TextRevealMask active={!revealMenuProjects || !menuClosing} delay={0.16} duration={0.9} instant={!revealMenuProjects || !!reducedMotion}>
                          <MenuRevealText enabled={revealMenuProjects} open={!menuClosing} reducedMotion={!!reducedMotion} distance="0.6em" enterDelay={0.16} exitDelay={0.03} className="text-reveal-word inline-block">
                            {langSwitched ? (
                              <ScrambleText from={projectCount} charDelay={switchCharDelay}>
                                {projectCount}
                              </ScrambleText>
                            ) : showContent ? (
                              <motion.span
                                className="inline-block"
                                initial={instant ? false : { y: '40%', opacity: 0 }}
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
                    </motion.h2>
                    <div id={navigationId} className="absolute left-0 top-[calc(100%+64px)]">
                      <HomeMenuLinks language={language} projectCount={projectCount} open={menuOpen && !menuClosing} onNavigate={closeImmediately} onProjects={scrollToWork} showProjects={false} />
                    </div>
                  </motion.div>

                  {/* Columns 2-3: Bio */}
                  <div className="relative col-span-4 lg:col-span-2 flex items-start justify-between">
                    <motion.div
                      ref={bioRef}
                      style={{ y: menuBioY, scale: menuBioScale, transformOrigin: 'top left', visibility: menuOpen || (menuFromHero && menuActive) ? 'visible' : bioVisibility, pointerEvents: menuOpen && !menuClosing ? 'auto' : bioPointerEvents, position: menuOpen || menuActive ? 'absolute' : 'relative' }}
                      className={`z-20 ${bigTextWeight} leading-none text-[40px] lg:text-[52px] xl:text-[64px] whitespace-nowrap ${bigTextTracking} transition-[font-weight,letter-spacing] duration-700 ease-in-out cursor-default`}
                    >
                      <MorphingBio
                        lines={t.bioLines}
                        expandedLines={expandedBioLines[language]}
                        expanded={menuOpen}
                        closing={menuClosing}
                        revealAll={!menuFromHero}
                        progress={progress}
                        renderLine={(line, index) => renderBioLine(line, index, fromT.bioLines[index])}
                        renderWord={(word) => {
                          const key: HoverKey | undefined = word.toLowerCase() === 'toronto'
                            ? 'stockholm' : word.toLowerCase() === 'ocad' ? 'newly' : undefined;
                          return key ? (
                            <span onMouseEnter={(event) => beginHover(key, event)} onMouseMove={moveHover} onMouseLeave={endHover}>
                              {word}
                            </span>
                          ) : word;
                        }}
                      />
                    </motion.div>
                    {(menuOpen || menuActive) && <div aria-hidden="true" className={`invisible ${bigTextWeight} leading-none text-[40px] lg:text-[52px] xl:text-[64px]`}>
                      {t.bioLines.map((line, index) => <p key={index}>{line}</p>)}
                    </div>}
                  </div>
                </div>

                {/* Roles and Time - 3 column grid (5 columns below lg) */}
                <motion.div ref={rolesRef} className="relative z-20 grid grid-cols-5 lg:grid-cols-3 gap-x-6 items-end pt-12 w-full" style={{ y: rolesY, opacity: menuRolesOpacity, filter: menuRolesBlur, visibility: menuOpen ? 'visible' : heroVisibility }}>
                  <div className="col-span-1">
                    <WZLogo className="w-[27px] h-[17px]" draw show={showContent} instant={instant} delay={rolesDelay} />
                  </div>

                  {/* Column 2: Roles, allowed to run into the next column */}
                  <motion.div
                    className="text-reveal-mask-open-right col-span-3 lg:col-span-1"
                    {...revealMaskAnimation(rolesDelay, 0.9, instant, true)}
                  >
                    {showContent ? (
                      <motion.div
                        initial={instant ? false : { y: '40%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{
                          duration: 0.9,
                          delay: rolesDelay,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        className="flex flex-wrap gap-x-3 gap-y-1 items-center"
                      >
                        <NewlyRole large label={roleLabel(t.designAt, fromT.designAt)} />
                        <FigmaRole large label={roleLabel(t.campusLeaderAt, fromT.campusLeaderAt)} />
                      </motion.div>
                    ) : (
                      <div className="opacity-0 flex gap-3 items-center">
                        <p className="font-normal text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap">Design at Newly</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Last column: Time and language globe */}
                  <motion.div
                    className="text-reveal-mask col-span-1 flex items-center justify-end gap-1.5 whitespace-nowrap"
                    {...revealMaskAnimation(timeDelay, 0.9, instant)}
                  >
                    {showContent ? (
                      <motion.div
                        className="flex items-center gap-1.5"
                        initial={instant ? false : { y: '40%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{
                          duration: 0.9,
                          delay: timeDelay,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
                        <span className="font-normal text-[14px] tracking-[-0.28px] leading-[1.2]">
                          {langSwitched ? (
                            <ScrambleText from={formatTorontoTime(prevLanguage)} charDelay={switchCharDelay}>
                              {currentTime}
                            </ScrambleText>
                          ) : (
                            currentTime
                          )}
                        </span>
                        <LanguageGlobe
                          onClick={cycleLanguage}
                          className="block w-3 h-3 shrink-0 cursor-pointer"
                        />
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-1.5 opacity-0">
                        <span className="font-normal text-[14px] tracking-[-0.28px] leading-[1.2]">{currentTime}</span>
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

      {/* Work - featured projects with photos, then the list of the rest.
          Each piece reveals as it scrolls into view, from when the footer
          would appear. */}
      <motion.div aria-hidden={menuOpen} inert={menuOpen} initial={false} animate={{ opacity: menuOpen ? 0 : 1 }} transition={{ duration: reducedMotion ? 0 : 0.35 }}>
      {hasShrunk && showContent && projects.length > 0 && (
        <HomeProjects
          projects={projects}
          heroScrollProgress={progress}
          skipFirstImageReveals
          className="pt-6"
          introSkipped={instant}
          revealReady={workRevealReady}
          scrollToHashWhenReady={introDone}
          onScrollToWork={scrollToProjects}
        />
      )}
      </motion.div>

      {/* Footer Section */}
      <AnimatePresence>
        {hasShrunk && showContent && (
          <motion.div
            className="relative flex flex-1 min-h-[239px] items-end justify-between p-9 w-full"
            aria-hidden={menuOpen}
            inert={menuOpen}
            initial={instant ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: menuOpen ? 0 : 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: footerDelay,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <div className="flex gap-6 items-center">
              <div className="w-[45px] h-[28px] shrink-0">
                <WZLogo className="w-full h-full" />
              </div>
              <div className="w-[354px] font-normal text-[14px] tracking-[-0.28px] leading-[1.2]">
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
            </div>
            <div className="flex gap-3 items-center justify-end font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">
              <a href={`mailto:${EMAIL}`}>hello [at] winstonzhao.ca</a>
              <Link href={RESUME_URL}>
                {translations.en.resume}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
