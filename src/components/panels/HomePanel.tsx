'use client';

import { motion, AnimatePresence, cubicBezier, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
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
  TextQLRole,
  WZLogo,
  LanguageGlobe,
  OLD_SITE_URL,
  RESUME_URL,
  EMAIL,
} from './shared';
import ThemeToggle from '@/components/ThemeToggle';
import { Language, translations } from './translations';
import HomeProjects from '@/components/projects/HomeProjects';
import CursorPreview, { useCursorPreview } from '@/components/projects/CursorPreview';
import type { ProjectCardData } from '@/components/projects/types';
import { useHeroScroll } from './useHeroScroll';
import HomeNavigationBackdrop from './HomeNavigationBackdrop';
import HeroBioLine from './HeroBioLine';
import HeaderMenu from '@/components/HeaderMenu';

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
  const { progress, headingY, projectsHeadingY, isAtHero, scrollToProjects, scrollToHero } = useHeroScroll({
    heroRef,
    headingRef,
    enabled: hasShrunk && showContent && projects.length > 0,
    ready: introDone,
  });
  const reducedMotion = useReducedMotion();
  // Give the name time to follow the scroll instead of compressing its
  // stagger into the scroll snap's fast opening movement.
  const smoothNameProgress = useSpring(progress, {
    stiffness: 60,
    damping: 22,
    mass: 1,
    restDelta: 0.001,
    restSpeed: 0.01,
  });
  const nameProgress = reducedMotion ? progress : smoothNameProgress;
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
  const nameScale = useTransform(nameProgress, [0, 1 - NAME_SCROLL_STAGGER], [1, compactNameScale], {
    ease: nameScrollEase,
  });
  const lastNameScale = useTransform(nameProgress, [NAME_SCROLL_STAGGER, 1], [1, compactNameScale], {
    ease: nameScrollEase,
  });
  const lastNameRelativeScale = useTransform(() => lastNameScale.get() / nameScale.get());
  // Compensate for the parent's leading scale so Zhao's position trails its
  // size, just as both do during the initial layout animation.
  const lastNameX = useTransform(() => lastNameOffset.get() * (lastNameRelativeScale.get() - 1));
  const navigationBlend = useTransform(progress, (value) => value >= 0.7 ? 'difference' : 'normal');
  const navigationColor = useTransform(progress, (value) => value >= 0.7 ? '#ffffff' : 'var(--foreground)');
  const compactNavigation = useSyncExternalStore(
    (onChange) => progress.on('change', onChange),
    () => progress.get() >= 0.7,
    () => false,
  );
  const heroOpacity = useTransform(progress, [0, 0.65, 1], [1, 0, 0]);
  const heroVisibility = useTransform(progress, (value) => value >= 0.65 ? 'hidden' : 'visible');
  const bioVisibility = useTransform(progress, (value) => value >= 1 ? 'hidden' : 'visible');
  const bioPointerEvents = useTransform(progress, (value) => value > 0 ? 'none' : 'auto');

  // Hover (and the weight crossfade) turns on once the intro has played; after a
  // language switch it waits for the full-line scramble to settle first.
  const interactive = introDone && (!langSwitched || scrambleSettled);

  // The photo that follows the cursor while the name or a bio word is hovered
  const preview = useCursorPreview();

  const hidePreview = useEffectEvent(() => preview.hide());
  useEffect(() => {
    if (!isAtHero) hidePreview();
  }, [isAtHero]);

  const beginHover = (key: HoverKey, e: React.MouseEvent) => {
    if (!isAtHero) return;
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

  return (
    <div className="theme-root bg-background flex flex-col min-h-screen w-full relative overflow-x-clip">
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
        images={HOVER_IMAGES.map((img) => ({
          key: img.key,
          content: <Image src={img.src} alt="" width={img.width} height={img.height} loading="eager" />,
        }))}
      />

      <HomeNavigationBackdrop progress={progress} />

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
            className="fixed top-9 left-9 right-9 z-40 flex items-start justify-between pointer-events-none"
            style={{ mixBlendMode: navigationBlend, color: navigationColor }}
            initial={instant ? false : undefined}
            animate={{
              height: hasShrunk ? shrunkFontSize : 'auto',
            }}
            transition={shrinkTransition}
          >
            <motion.div className="flex gap-4 items-start pointer-events-auto" style={{ scale: nameScale, transformOrigin: 'top left' }}>
              {/* The font size snaps to its target and each word FLIPs from
                  its previous box via the layout prop, so the last name's
                  position and scale can trail the first name's together. */}
              <h1
                ref={headerRef}
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
                  tabIndex={isAtHero ? -1 : 0}
                  aria-disabled={isAtHero}
                  aria-label={isAtHero ? undefined : `${t.name} — Back to top`}
                  onClick={() => {
                    if (isAtHero) return;
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
                <span
                  className="font-light text-[20px] leading-none"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  <ScrambleText from={fromT.nativeName} charDelay={switchCharDelay}>
                    {t.nativeName}
                  </ScrambleText>
                </span>
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
                  <HeaderMenu
                    collapsed={compactNavigation}
                    links={[
                      { id: 'contact', href: `mailto:${EMAIL}`, label: roleLabel(t.navContact, fromT.navContact) },
                      { id: 'resume', href: RESUME_URL, label: roleLabel(t.navResume, fromT.navResume) },
                    ]}
                  />
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
                  <motion.div ref={headingRef} className="relative z-20 col-span-1 self-start" style={{ y: projectsHeadingY }}>
                    <h2>
                    <a
                      href="#work"
                      onClick={scrollToWork}
                      className={`flex gap-2 items-start ${bigTextWeight} whitespace-nowrap cursor-pointer transition-[font-weight] duration-700 ease-in-out`}
                    >
                      <motion.span
                        className={`text-[40px] lg:text-[52px] xl:text-[64px] leading-none ${bigTextTracking} transition-[letter-spacing] duration-700 ease-in-out`}
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                        animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                        transition={{
                          duration: 0.5,
                          delay: workDelay + 0.5,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
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
                      </motion.span>
                      <motion.span
                        className="text-[13px] lg:text-[16px] xl:text-[20px] leading-normal tracking-[-0.26px] lg:tracking-[-0.32px] xl:tracking-[-0.4px]"
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                        animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                        transition={{
                          duration: 0.5,
                          delay: workDelay + stagger + 0.5,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
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
                      </motion.span>
                    </a>
                    </h2>
                  </motion.div>

                  {/* Columns 2-3: Bio */}
                  <div className="col-span-4 lg:col-span-2 flex items-start justify-between">
                    <motion.div
                      style={{ y: headingY, visibility: bioVisibility, pointerEvents: bioPointerEvents }}
                      className={`${bigTextWeight} leading-none text-[40px] lg:text-[52px] xl:text-[64px] whitespace-nowrap ${bigTextTracking} transition-[font-weight,letter-spacing] duration-700 ease-in-out cursor-default`}
                    >
                      {t.bioLines.map((line, index) => (
                        <HeroBioLine key={index} progress={progress} index={index} lines={t.bioLines}>
                          {renderBioLine(line, index, fromT.bioLines[index])}
                        </HeroBioLine>
                      ))}
                    </motion.div>
                    <motion.div style={{ opacity: heroOpacity, visibility: heroVisibility }}>
                      {showContent ? (
                        <motion.div
                          className="w-9 h-9 shrink-0"
                          initial={instant ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: iconDelay,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        >
                          <ThemeToggle className="w-full h-full" />
                        </motion.div>
                      ) : (
                        <div className="w-9 h-9 shrink-0 opacity-0">
                          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                            <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Roles and Time - 3 column grid (5 columns below lg) */}
                <motion.div className="grid grid-cols-5 lg:grid-cols-3 gap-x-6 items-end pt-12 w-full" style={{ opacity: heroOpacity, visibility: heroVisibility }}>
                  <div className="col-span-1">
                    <WZLogo className="w-[27px] h-[17px]" draw show={showContent} instant={instant} delay={rolesDelay} />
                  </div>

                  {/* Column 2: Roles (allowed to run on into column 3, so the
                      reveal clip leaves the right side open) */}
                  <motion.div
                    className="col-span-3 lg:col-span-1"
                    initial={{ clipPath: 'inset(-10% -200% 0 -10%)' }}
                    animate={{ clipPath: 'inset(-10% -200% -20% -10%)' }}
                    transition={{
                      duration: 0.5,
                      delay: rolesDelay + 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
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
                        <TextQLRole large label={roleLabel(t.prevDesignAt, fromT.prevDesignAt)} />
                      </motion.div>
                    ) : (
                      <div className="opacity-0 flex gap-3 items-center">
                        <p className="font-normal text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap">Design at Newly</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Last column: Time and language globe */}
                  <motion.div
                    className="col-span-1 flex items-center justify-end gap-1.5 whitespace-nowrap"
                    initial={instant ? false : { clipPath: 'inset(-10% -10% 0 -10%)' }}
                    animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                    transition={{
                      duration: 0.5,
                      delay: timeDelay + 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    }}
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

      {/* Footer Section */}
      <AnimatePresence>
        {hasShrunk && showContent && (
          <motion.div
            className="relative flex flex-1 min-h-[239px] items-end justify-between p-9 w-full"
            initial={instant ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                  {langSwitched ? (
                    <ScrambleText from={fromT.newPortfolio} charDelay={switchCharDelay}>
                      {t.newPortfolio}
                    </ScrambleText>
                  ) : (
                    t.newPortfolio
                  )}
                </p>
                <p>
                  {langSwitched ? (
                    <ScrambleText from={fromT.checkBackPrefix} charDelay={switchCharDelay}>
                      {t.checkBackPrefix}
                    </ScrambleText>
                  ) : (
                    t.checkBackPrefix
                  )}
                  <a
                    href={OLD_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {langSwitched ? (
                      <ScrambleText from={fromT.oldSiteLink} charDelay={switchCharDelay}>
                        {t.oldSiteLink}
                      </ScrambleText>
                    ) : (
                      t.oldSiteLink
                    )}
                  </a>
                  {langSwitched ? (
                    <ScrambleText from={fromT.period} charDelay={switchCharDelay}>
                      {t.period}
                    </ScrambleText>
                  ) : (
                    t.period
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-center justify-end font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">
              <a href={`mailto:${EMAIL}`}>hello [at] winstonzhao.ca</a>
              <Link href={RESUME_URL}>
                {langSwitched ? (
                  <ScrambleText from={fromT.resume} charDelay={switchCharDelay}>
                    {t.resume}
                  </ScrambleText>
                ) : (
                  t.resume
                )}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
