'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatedText,
  ScrambleText,
  formatStockholmTime,
  useCurrentTime,
  NewlyRole,
  FigmaRole,
  TextQLRole,
  LINKEDIN_URL,
  OLD_SITE_URL,
  RESUME_URL,
  EMAIL,
} from './shared';
import { Language, translations } from './translations';

interface HomePanelProps {
  showContent?: boolean;
  // Render everything in its final state with no entrance animations
  instant?: boolean;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}

// Vertical column guides are hidden in the current design.
// Flip this back to true to restore them.
const SHOW_COLUMN_GUIDES = false;

// Split the display name into its leading word and the rest so the two can
// shrink on a stagger. A single-word name keeps everything in the first slot.
const splitName = (name: string): [string, string] => {
  const i = name.indexOf(' ');
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
};

type HoverKey = 'name' | 'stockholm' | 'newly';

// Desktop-only feature: hovering the name or a highlighted bio word reveals an
// image in the blank space on the left. Positions/sizes mirror the Figma
// frames (1280×832 reference) — `left` hugs the page's left padding and `top`
// is a percentage of viewport height so the images track the blank band as the
// window resizes.
const HOVER_IMAGES: ReadonlyArray<{
  key: HoverKey;
  src: string;
  alt: string;
  left: string;
  top: string;
  width: number;
  height: number;
}> = [
  { key: 'name', src: '/profile.png', alt: 'Winston Zhao', left: '36px', top: '44.5%', width: 154, height: 154 },
  { key: 'stockholm', src: '/stockholm.jpeg', alt: 'Stockholm', left: '188px', top: '38.3%', width: 237, height: 316 },
  { key: 'newly', src: '/newlygraphic.png', alt: 'Newly', left: '36px', top: '48.7%', width: 390, height: 230 },
];

// Bio lines (by index) that carry a hover word, with the matching word per
// language so the highlight follows a language switch.
const HOVER_BIO_WORDS: Record<number, { key: HoverKey; word: Record<Language, string> }> = {
  2: { key: 'stockholm', word: { en: 'stockholm', sv: 'stockholm', zh: '斯德哥尔摩' } },
  3: { key: 'newly', word: { en: 'newly', sv: 'newly', zh: 'Newly' } },
};

// Hovering makes display text ease to a slightly lighter weight. PP Neue
// Montreal ships as discrete static weights (no variable axis), so a plain
// font-weight transition snaps between the bundled files. WeightCrossfade
// instead stacks two identical copies at the two weights and crossfades their
// opacity, which reads as a smooth thinning.
const WEIGHT_NORMAL = 500;
const WEIGHT_HOVER = 400;
const WEIGHT_NORMAL_ZH = 300;
const WEIGHT_HOVER_ZH = 100; // nearest lighter weight the font provides
const WEIGHT_FADE_MS = 300;

function WeightCrossfade({
  active,
  base,
  over,
  baseWeight,
  hoverWeight,
  className = '',
  onMouseEnter,
  onMouseLeave,
}: {
  active: boolean;
  // Two renders of the same text; both stay mounted so they line up exactly.
  base: ReactNode;
  over: ReactNode;
  baseWeight: number;
  hoverWeight: number;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span
        className="transition-opacity ease-in-out"
        style={{ opacity: active ? 0 : 1, transitionDuration: `${WEIGHT_FADE_MS}ms`, fontWeight: baseWeight }}
      >
        {base}
      </span>
      <span
        aria-hidden
        className="absolute left-0 top-0 whitespace-nowrap transition-opacity ease-in-out"
        style={{ opacity: active ? 1 : 0, transitionDuration: `${WEIGHT_FADE_MS}ms`, fontWeight: hoverWeight }}
      >
        {over}
      </span>
    </span>
  );
}

export default function HomePanel({
  showContent = true,
  instant = false,
  language = 'en',
  onLanguageChange,
}: HomePanelProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('220.84px');
  const [shrunkFontSize, setShrunkFontSize] = useState('128px');
  const [hasShrunk, setHasShrunk] = useState(instant);
  // True once the user has changed language: changed copy then re-animates
  // with the scramble effect instead of the intro animations.
  const [langSwitched, setLangSwitched] = useState(false);
  // Language shown before the switch, so the outgoing copy stays on screen
  // until the scramble replaces it.
  const [prevLanguage, setPrevLanguage] = useState<Language>(language);
  // Which element (name / "stockholm" / "newly") is currently hovered, driving
  // the image that pops up in the blank left space (desktop only).
  const [hovered, setHovered] = useState<HoverKey | null>(null);
  // Hover only becomes active once the intro has finished playing, so nothing
  // pops up mid-animation while the page is still loading in.
  const [introDone, setIntroDone] = useState(instant);
  const currentTime = useCurrentTime(language);
  const t = translations[language];
  const fromT = translations[prevLanguage];

  const handleLanguageChange = (lang: Language) => {
    if (lang === language) return;
    setPrevLanguage(language);
    setLangSwitched(true);
    onLanguageChange?.(lang);
  };

  useEffect(() => {
    const updateFontSize = () => {
      // Don't update if already shrunk
      if (hasShrunk) return;

      if (headerRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Use the known name rather than textContent: the hover crossfade keeps
        // a second copy of the name in the heading, which would double it.
        const text = t.name;

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
  }, [hasShrunk, t.name]);

  // Scale the shrunk header up on screens larger than a 16" MacBook (1728px),
  // keeping 128px as the floor for normal laptop sizes.
  useEffect(() => {
    const updateShrunkFontSize = () => {
      const breakpoint = 1728;
      const baseSize = 128;
      // How aggressively the header grows past the breakpoint (1 = linear with
      // width; higher = grows faster on large displays).
      const growthFactor = 2;
      const width = window.innerWidth;
      let size;
      if (width < 1024) {
        // Cramped layouts between mobile and lg: shrink the header a lot.
        size = 72;
      } else if (width > breakpoint) {
        size = baseSize + ((width - breakpoint) / breakpoint) * baseSize * growthFactor;
      } else {
        size = baseSize;
      }
      setShrunkFontSize(`${size}px`);
    };

    updateShrunkFontSize();
    window.addEventListener('resize', updateShrunkFontSize);
    return () => window.removeEventListener('resize', updateShrunkFontSize);
  }, []);

  // Timing configuration
  const headerAnimationDelay = 0.2; // When header starts appearing
  const shrinkDelay = 1.3; // Seconds after page load to start shrinking
  const shrinkDuration = 0.8; // Duration of shrink animation
  const nameStagger = 0.06; // How far the last name trails the first during shrink

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
  }, [showContent, instant]);

  // Animation configuration - content appears during/after shrink
  const contentBaseDelay = 0.4; // Delay after shrink before content animates
  const stagger = 0.1;
  const bioStagger = 0.03; // Tighter stagger for bio section

  // Header section timing (initial appear animation)
  const headerDelay = headerAnimationDelay;

  // Everything else animates relative to when shrink happens
  const sayHiDelay = contentBaseDelay;

  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.5;
  const bioStartDelay = sayHiDelay + 2 * stagger + bioPause;

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

  const shrinkTransition = {
    duration: instant ? 0 : shrinkDuration,
    ease: [0.76, 0, 0.15, 1] as const,
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

  // Renders one bio line. Lines that contain a hover word are split into
  // before / word / after so the word can carry its own hover handlers while
  // keeping the original intro stagger and language-switch scramble continuous.
  const renderBioLine = (line: string, index: number, fromLine: string) => {
    const plain = () =>
      langSwitched ? (
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

    const config = HOVER_BIO_WORDS[index];
    const word = config ? config.word[language] : undefined;
    if (!config || !word || !line.includes(word)) return plain();

    const key = config.key;
    const isZh = language === 'zh';
    const [before, after] = line.split(word);
    // Crossfade the keyword between its normal and lighter weight on hover.
    // `make` is called twice so both stacked copies are byte-identical and line
    // up exactly. Hover is inert until the intro has finished.
    const wrap = (make: () => ReactNode) => (
      <WeightCrossfade
        active={hovered === key}
        baseWeight={isZh ? WEIGHT_NORMAL_ZH : WEIGHT_NORMAL}
        hoverWeight={isZh ? WEIGHT_HOVER_ZH : WEIGHT_HOVER}
        className={introDone ? 'cursor-pointer' : ''}
        onMouseEnter={() => {
          if (introDone) setHovered(key);
        }}
        onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
        base={make()}
        over={make()}
      />
    );

    if (langSwitched) {
      const fromWord = config.word[prevLanguage];
      const [beforeFrom, afterFrom] =
        fromWord && fromLine.includes(fromWord) ? fromLine.split(fromWord) : [fromLine, ''];
      return (
        <>
          <ScrambleText from={beforeFrom} charDelay={switchCharDelay}>
            {before}
          </ScrambleText>
          {wrap(() => (
            <ScrambleText
              from={fromWord ?? word}
              baseDelay={before.length * switchCharDelay}
              charDelay={switchCharDelay}
            >
              {word}
            </ScrambleText>
          ))}
          {after && (
            <ScrambleText
              from={afterFrom}
              baseDelay={(before.length + word.length) * switchCharDelay}
              charDelay={switchCharDelay}
            >
              {after}
            </ScrambleText>
          )}
        </>
      );
    }

    if (showContent) {
      const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
      const beforeWords = countWords(before);
      const wordWords = countWords(word);
      return (
        <>
          <AnimatedText baseDelay={bioIntroDelays[index]} staggerDelay={0.03} instant={instant}>
            {before}
          </AnimatedText>
          {wrap(() => (
            <AnimatedText
              baseDelay={bioIntroDelays[index] + beforeWords * 0.03}
              staggerDelay={0.03}
              instant={instant}
            >
              {word}
            </AnimatedText>
          ))}
          {after && (
            <AnimatedText
              baseDelay={bioIntroDelays[index] + (beforeWords + wordWords) * 0.03}
              staggerDelay={0.03}
              instant={instant}
            >
              {after}
            </AnimatedText>
          )}
        </>
      );
    }

    return (
      <span className="opacity-0">
        {before}
        {wrap(() => word)}
        {after}
      </span>
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

  // Role labels render as plain text until a language switch, then scramble.
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
    <div className="bg-background flex flex-col gap-9 h-screen w-full relative overflow-hidden">
      {/* Background column guides - same grid as the page content (currently hidden) */}
      {SHOW_COLUMN_GUIDES && (
        <div
          className="absolute inset-y-0 inset-x-9 grid grid-cols-5 gap-x-6 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="border-x border-[#1E1E1E]/8 dark:border-white/8 origin-top"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: showContent ? 1 : 0 }}
              transition={{ duration: 1.2, delay: headerAnimationDelay + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      )}

      {/* Hover images - desktop only (lg+). The name and the highlighted bio
          words ("stockholm", "newly") reveal an image in the blank left space.
          All three stay mounted (with priority) so they're preloaded on page
          load and appear instantly on hover; visibility toggles with no
          transition. Hidden below lg so they never collide with the narrower
          bio layout. */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        {HOVER_IMAGES.map((img) => (
          <div
            key={img.key}
            className="absolute"
            style={{
              left: img.left,
              top: img.top,
              width: img.width,
              height: img.height,
              opacity: hovered === img.key ? 1 : 0,
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              priority
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Header Section */}
      <div className="relative flex flex-col items-start p-9 w-full">
        <div className="flex flex-col gap-9 items-start w-full">
          {/* Header Content */}
          <motion.div
            ref={containerRef}
            className="flex items-start justify-between w-full"
            animate={{
              height: hasShrunk ? shrunkFontSize : 'auto',
            }}
            transition={shrinkTransition}
          >
            <div className="flex gap-4 items-start">
              {/* The font size snaps to its target and each word FLIPs from
                  its previous box via the layout prop, so the last name's
                  position and scale can trail the first name's together. */}
              <h1
                ref={headerRef}
                onMouseEnter={() => {
                  if (introDone) setHovered('name');
                }}
                onMouseLeave={() => setHovered((h) => (h === 'name' ? null : h))}
                className={`font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap leading-none ${introDone ? 'cursor-pointer' : ''}`}
                style={{
                  letterSpacing: '-0.05em',
                  marginTop: '-0.15em',
                  marginBottom: '-0.1em',
                  fontSize: hasShrunk ? shrunkFontSize : fontSize,
                  paddingTop: hasShrunk ? '8px' : '0px',
                }}
              >
                <motion.span
                  layout={!nameShrinkDone}
                  className="inline-block align-top"
                  transition={shrinkTransition}
                >
                  <WeightCrossfade
                    active={hovered === 'name'}
                    baseWeight={WEIGHT_NORMAL}
                    hoverWeight={WEIGHT_HOVER}
                    base={namePart(firstName, fromFirstName, 0)}
                    over={namePart(firstName, fromFirstName, 0)}
                  />
                </motion.span>
                {lastName && (
                  <>
                    {' '}
                    <motion.span
                      layout={!nameShrinkDone}
                      className="inline-block align-top"
                      transition={lastNameShrinkTransition}
                    >
                      <WeightCrossfade
                        active={hovered === 'name'}
                        baseWeight={WEIGHT_NORMAL}
                        hoverWeight={WEIGHT_HOVER}
                        base={namePart(lastName, fromLastName, 1)}
                        over={namePart(lastName, fromLastName, 1)}
                      />
                    </motion.span>
                  </>
                )}
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
            </div>

            {/* Language Switcher - appears after shrink */}
            <AnimatePresence>
              {hasShrunk && showContent && (
                <motion.div
                  className="flex gap-1.5 items-center justify-center font-normal text-[12px] tracking-[-0.24px] text-[#1E1E1E] dark:text-white whitespace-nowrap leading-normal"
                  initial={instant ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: languagesDelay,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <button type="button" onClick={() => handleLanguageChange('en')} className="cursor-pointer">
                    EN
                  </button>
                  <button type="button" onClick={() => handleLanguageChange('sv')} className="cursor-pointer">
                    SV
                  </button>
                  <button type="button" onClick={() => handleLanguageChange('zh')} className="cursor-pointer">
                    中文
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bio Section */}
          <AnimatePresence>
            {hasShrunk && (
              <motion.div
                className="flex flex-col gap-12 w-full"
                initial={instant ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Say Hi and Bio - 5 Column Grid */}
                <div className="grid grid-cols-5 gap-x-6 w-full">
                  {/* Column 1: Say Hi Link */}
                  <div className="col-span-1">
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex gap-2 items-start ${bigTextWeight} text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer transition-[font-weight] duration-700 ease-in-out`}
                    >
                      <motion.span
                        className={`text-[40px] lg:text-[52px] xl:text-[64px] leading-none ${bigTextTracking} transition-[letter-spacing] duration-700 ease-in-out`}
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                        animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                        transition={{
                          duration: 0.5,
                          delay: sayHiDelay + 0.5,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
                        {langSwitched ? (
                          <ScrambleText from={fromT.sayHi} charDelay={switchCharDelay}>
                            {t.sayHi}
                          </ScrambleText>
                        ) : showContent ? (
                          <motion.span
                            className="inline-block"
                            initial={instant ? false : { y: '40%', opacity: 0 }}
                            animate={{ y: '0%', opacity: 1 }}
                            transition={{
                              duration: 0.9,
                              delay: sayHiDelay,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                          >
                            {t.sayHi}
                          </motion.span>
                        ) : (
                          <span className="opacity-0">{t.sayHi}</span>
                        )}
                      </motion.span>
                      <motion.span
                        className="text-[13px] lg:text-[16px] xl:text-[20px] leading-normal tracking-[-0.26px] lg:tracking-[-0.32px] xl:tracking-[-0.4px]"
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                        animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                        transition={{
                          duration: 0.5,
                          delay: sayHiDelay + stagger + 0.5,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
                        {langSwitched ? (
                          <ScrambleText from={fromT.sayHiLabel} charDelay={switchCharDelay}>
                            {t.sayHiLabel}
                          </ScrambleText>
                        ) : showContent ? (
                          <motion.span
                            className="inline-block"
                            initial={instant ? false : { y: '40%', opacity: 0 }}
                            animate={{ y: '0%', opacity: 1 }}
                            transition={{
                              duration: 0.9,
                              delay: sayHiDelay + stagger,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                          >
                            {t.sayHiLabel}
                          </motion.span>
                        ) : (
                          <span className="opacity-0">{t.sayHiLabel}</span>
                        )}
                      </motion.span>
                    </a>
                  </div>

                  {/* Column 2: Empty spacer (collapses below lg to tighten the gap) */}
                  <div className="hidden lg:block lg:col-span-1" />

                  {/* Columns 3-5: Bio */}
                  <div className="col-span-4 lg:col-span-3 flex items-start justify-between">
                    <div className={`${bigTextWeight} leading-none text-[40px] lg:text-[52px] xl:text-[64px] text-[#1E1E1E] dark:text-white whitespace-nowrap ${bigTextTracking} transition-[font-weight,letter-spacing] duration-700 ease-in-out`}>
                      {t.bioLines.map((line, index) => (
                        <p key={index} className={index < t.bioLines.length - 1 ? 'mb-0' : undefined}>
                          {renderBioLine(line, index, fromT.bioLines[index])}
                        </p>
                      ))}
                    </div>
                    {showContent ? (
                      <motion.div
                        className="w-9 h-9 shrink-0 text-[#1E1E1E] dark:text-white"
                        initial={instant ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.8,
                          delay: iconDelay,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="animate-spin-slow">
                          <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </motion.div>
                    ) : (
                      <div className="w-9 h-9 shrink-0 opacity-0">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                          <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roles and Time - 5 Column Grid */}
                <div className="grid grid-cols-5 gap-x-6 items-center w-full text-[#1E1E1E] dark:text-white">
                  {/* Columns 1-2: Empty (collapses below lg to left-align roles) */}
                  <div className="hidden lg:block lg:col-span-2" />

                  {/* Columns 3-4: Roles */}
                  <motion.div
                    className="col-span-4 lg:col-span-2"
                    initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                    animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
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
                        className="flex gap-3 items-center"
                      >
                        <NewlyRole label={roleLabel(t.designAt, fromT.designAt)} />
                        <FigmaRole label={roleLabel(t.campusLeaderAt, fromT.campusLeaderAt)} />
                        <TextQLRole label={roleLabel(t.prevDesignAt, fromT.prevDesignAt)} />
                      </motion.div>
                    ) : (
                      <div className="opacity-0 flex gap-3 items-center">
                        <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Design at Newly</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Column 5: Time */}
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
                        <span className="font-medium text-[12px] tracking-[-0.24px] leading-normal">
                          {langSwitched ? (
                            <ScrambleText from={formatStockholmTime(prevLanguage)} charDelay={switchCharDelay}>
                              {currentTime}
                            </ScrambleText>
                          ) : (
                            currentTime
                          )}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E] dark:bg-white shrink-0 self-center" />
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-1.5 opacity-0">
                        <span className="font-medium text-[12px] tracking-[-0.24px] leading-normal">{currentTime}</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E] dark:bg-white shrink-0 self-center" />
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Section */}
      <AnimatePresence>
        {hasShrunk && showContent && (
          <motion.div
            className="relative flex flex-1 items-end justify-between p-9 w-full text-[#1E1E1E] dark:text-white"
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
                <Image
                  src="/wz-logo.svg"
                  alt="WZ"
                  width={45}
                  height={28}
                  className="w-full h-full object-contain dark:invert"
                />
              </div>
              <div className="w-[354px] font-normal text-[12px] tracking-[-0.24px] leading-normal">
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
