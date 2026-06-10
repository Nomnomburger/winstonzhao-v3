'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
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

  const shrinkTransition = {
    duration: instant ? 0 : shrinkDuration,
    ease: [0.76, 0, 0.15, 1] as const,
  };

  // Scramble timing for language switches: all texts animate at once, each
  // sweeping through its own characters left to right.
  const switchCharDelay = 0.03;
  const bioIntroDelays = [bio1Delay, bio2Delay, bio3Delay, bio4Delay];

  // Role labels render as plain text until a language switch, then scramble.
  const roleLabel = (text: string, fromText: string) =>
    langSwitched ? (
      <ScrambleText from={fromText} charDelay={switchCharDelay}>
        {text}
      </ScrambleText>
    ) : (
      text
    );

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
            <motion.h1
              ref={headerRef}
              className="font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap leading-none"
              initial={instant ? false : undefined}
              animate={{
                fontSize: hasShrunk ? shrunkFontSize : fontSize,
                paddingTop: hasShrunk ? '8px' : '0px',
              }}
              transition={shrinkTransition}
              style={{
                letterSpacing: '-0.05em',
                marginTop: '-0.15em',
                marginBottom: '-0.1em',
              }}
            >
              {showContent && (
                <AnimatedText baseDelay={headerDelay} staggerDelay={stagger} instant={instant}>
                  Winston Zhao
                </AnimatedText>
              )}
              {!showContent && <span className="opacity-0">Winston Zhao</span>}
            </motion.h1>

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
                  <p>中文</p>
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
                      className="flex gap-2 items-start font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer"
                    >
                      <motion.span
                        className="text-[40px] lg:text-[52px] xl:text-[64px] leading-none tracking-[-1.6px] lg:tracking-[-2.08px] xl:tracking-[-2.56px]"
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
                        {showContent ? (
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
                            LNKD
                          </motion.span>
                        ) : (
                          <span className="opacity-0">LNKD</span>
                        )}
                      </motion.span>
                    </a>
                  </div>

                  {/* Column 2: Empty spacer (collapses below lg to tighten the gap) */}
                  <div className="hidden lg:block lg:col-span-1" />

                  {/* Columns 3-5: Bio */}
                  <div className="col-span-4 lg:col-span-3 flex items-start justify-between">
                    <div className="font-medium leading-none text-[40px] lg:text-[52px] xl:text-[64px] text-[#1E1E1E] dark:text-white whitespace-nowrap tracking-[-1.6px] lg:tracking-[-2.08px] xl:tracking-[-2.56px]">
                      {t.bioLines.map((line, index) => (
                        <p key={index} className={index < t.bioLines.length - 1 ? 'mb-0' : undefined}>
                          {langSwitched ? (
                            <ScrambleText from={fromT.bioLines[index]} charDelay={switchCharDelay}>
                              {line}
                            </ScrambleText>
                          ) : showContent ? (
                            <AnimatedText baseDelay={bioIntroDelays[index]} staggerDelay={0.03} instant={instant}>
                              {line}
                            </AnimatedText>
                          ) : (
                            <span className="opacity-0">{line}</span>
                          )}
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
                  .
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
