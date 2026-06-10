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

// "Zhao" sits in the second of the two mobile grid columns: half the
// container width plus half the 12px column gap (~51.7% of the row).
const ZHAO_COLUMN_OFFSET_RATIO = 0.517;
const ZHAO_COLUMN_OFFSET = `${ZHAO_COLUMN_OFFSET_RATIO * 100}%`;

// Profile photo height relative to the shrunk font size — matches the visual
// (cap) height of "Zhao" (46px photo next to 64px text in the original design).
const PHOTO_TO_FONT_RATIO = 46 / 64;

// Vertical column guides are hidden in the current design.
// Flip this back to true to restore them.
const SHOW_COLUMN_GUIDES = false;

// Fallback page shift for the footer reveal (footer height + 36px gap),
// replaced by a live measurement when the arrows are tapped.
const FOOTER_OFFSET_FALLBACK = 188;

interface HomePanelMobileProps {
  showContent?: boolean;
  // Render everything in its final state with no entrance animations
  instant?: boolean;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}

export default function HomePanelMobile({
  showContent = true,
  instant = false,
  language = 'en',
  onLanguageChange,
}: HomePanelMobileProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('96px');
  const [shrunkFontSize, setShrunkFontSize] = useState(64);
  const [hasShrunk, setHasShrunk] = useState(instant);
  const [footerOpen, setFooterOpen] = useState(false);
  const [footerOffset, setFooterOffset] = useState(FOOTER_OFFSET_FALLBACK);
  // True once the user has changed language: changed copy then re-animates
  // with the scramble effect instead of the intro animations.
  const [langSwitched, setLangSwitched] = useState(false);
  // Language shown before the switch, so the outgoing copy stays on screen
  // until the scramble replaces it.
  const [prevLanguage, setPrevLanguage] = useState<Language>(language);
  const currentTime = useCurrentTime(language);
  const t = translations[language];
  const fromT = translations[prevLanguage];

  // The globe cycles between English and Swedish
  const toggleLanguage = () => {
    setPrevLanguage(language);
    setLangSwitched(true);
    onLanguageChange?.(language === 'en' ? 'sv' : 'en');
  };

  useEffect(() => {
    const updateFontSize = () => {
      // Don't update if already shrunk
      if (hasShrunk) return;

      if (headerRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;

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

    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    return () => window.removeEventListener('resize', updateFontSize);
  }, [hasShrunk]);

  // Shrunk size: "Zhao" fills from its column offset to the right edge of the
  // page; "Winston" shares the size and the photo scales with Zhao's height.
  useEffect(() => {
    const updateShrunkFontSize = () => {
      if (!headerRef.current || !containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
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

      document.body.removeChild(measureEl);
      setShrunkFontSize(bestSize);
    };

    updateShrunkFontSize();
    window.addEventListener('resize', updateShrunkFontSize);
    return () => window.removeEventListener('resize', updateShrunkFontSize);
  }, []);

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
  const sayHiDelay = bio4Delay + 4 * bioStagger;
  const iconDelay = sayHiDelay + stagger;
  const rolesDelay = sayHiDelay + stagger;
  const timeDelay = rolesDelay + 0.05;
  const arrowsDelay = timeDelay + 0.05;
  const globeDelay = contentBaseDelay + 0.1;

  const shrinkTransition = {
    duration: instant ? 0 : shrinkDuration,
    ease: [0.76, 0, 0.15, 1] as const,
  };

  // Scramble timing for language switches: all texts animate at once, each
  // sweeping through its own characters left to right.
  const switchCharDelay = 0.02;
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

  const setFooterRevealed = (open: boolean) => {
    if (open && footerRef.current) {
      setFooterOffset(footerRef.current.offsetHeight + 36);
    }
    setFooterOpen(open);
  };

  const toggleFooter = () => setFooterRevealed(!footerOpen);

  // Swiping up reveals the footer, swiping down hides it
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || !hasShrunk) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (Math.abs(deltaY) < 50) return;
    setFooterRevealed(deltaY > 0);
  };

  return (
    <div
      className="bg-background h-dvh w-full relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background column guides - 2 column mobile grid (currently hidden) */}
      {SHOW_COLUMN_GUIDES && (
        <div
          className="absolute inset-y-0 inset-x-6 grid grid-cols-2 gap-x-3 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 2 }).map((_, i) => (
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

      {/* Sliding page - shifts up to reveal the footer below the fold */}
      <motion.div
        className="flex flex-col gap-9 w-full"
        animate={{ y: footerOpen ? -footerOffset : 0 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.15, 1] }}
      >
        {/* Header Section - exactly one viewport tall */}
        <div className="relative flex flex-col h-dvh shrink-0 items-start p-6 w-full">
          <div className="flex flex-col flex-1 gap-12 items-start w-full">
            {/* Header Content */}
            <div ref={containerRef} className="relative w-full py-1">
              <motion.h1
                ref={headerRef}
                className="font-medium text-[#1E1E1E] dark:text-white leading-none w-full"
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
                <span className="block whitespace-nowrap">
                  {showContent ? (
                    <AnimatedText baseDelay={headerDelay} staggerDelay={stagger}>
                      Winston
                    </AnimatedText>
                  ) : (
                    <span className="opacity-0">Winston</span>
                  )}
                </span>
                <motion.span
                  className="block whitespace-nowrap relative"
                  animate={{
                    paddingLeft: hasShrunk ? ZHAO_COLUMN_OFFSET : '0%',
                  }}
                  transition={shrinkTransition}
                >
                  {showContent ? (
                    <AnimatedText baseDelay={headerDelay + stagger} staggerDelay={stagger}>
                      Zhao
                    </AnimatedText>
                  ) : (
                    <span className="opacity-0">Zhao</span>
                  )}

                  {/* Profile picture - appears beside "Zhao" once the name settles.
                      Always mounted (with priority) so the image is preloaded
                      while the loading line runs, instead of popping in late. */}
                  <motion.span
                    className="block absolute right-[calc(50%+6px)] top-1/2"
                    style={{
                      width: photoSize,
                      height: photoSize,
                      marginTop: -photoSize / 2,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={hasShrunk && showContent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 0.6,
                      delay: shrinkDuration,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    <Image
                      src="/profile.png"
                      alt="Winston Zhao"
                      width={128}
                      height={128}
                      priority
                      className="w-full h-full object-cover"
                    />
                  </motion.span>
                </motion.span>
              </motion.h1>

              {/* Globe - appears after shrink */}
              <AnimatePresence>
                {hasShrunk && showContent && (
                  <motion.div
                    className="absolute top-1 right-0 w-4 h-4 text-[#1E1E1E] dark:text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: globeDelay,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    <button
                      type="button"
                      onClick={toggleLanguage}
                      aria-label="Switch language"
                      className="block w-full h-full cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
                        <path d="M1.5 8H14.5" stroke="currentColor" />
                        <path d="M8 1.5C9.8 3.3 10.75 5.55 10.75 8C10.75 10.45 9.8 12.7 8 14.5C6.2 12.7 5.25 10.45 5.25 8C5.25 5.55 6.2 3.3 8 1.5Z" stroke="currentColor" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bio Section */}
            <AnimatePresence>
              {hasShrunk && (
                <motion.div
                  className="flex flex-col flex-1 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col gap-12 w-full">
                    {/* Bio */}
                    <div className="font-medium leading-none text-[32px] text-[#1E1E1E] dark:text-white tracking-[-1.28px]">
                      {t.bioLines.map((line, index) => (
                        <p key={index} className={index < t.bioLines.length - 1 ? 'mb-0' : undefined}>
                          {langSwitched ? (
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
                        </p>
                      ))}
                    </div>

                    {/* Say Hi + Icon */}
                    <div className="flex gap-9 items-center justify-between w-full">
                      <a
                        href={LINKEDIN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-2 items-start font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer"
                      >
                        <motion.span
                          className="text-[32px] leading-none tracking-[-1.28px]"
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
                              initial={{ y: '40%', opacity: 0 }}
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
                          className="text-[12px] leading-normal tracking-[-0.24px]"
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
                              initial={{ y: '40%', opacity: 0 }}
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
                      {showContent ? (
                        <motion.div
                          className="w-8 h-8 shrink-0 text-[#1E1E1E] dark:text-white"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: iconDelay,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        >
                          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="w-full h-full animate-spin-slow">
                            <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </motion.div>
                      ) : (
                        <div className="w-8 h-8 shrink-0 opacity-0">
                          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="w-full h-full">
                            <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roles and Time - pinned to the bottom of the viewport */}
                  <div className="flex items-start justify-between mt-auto pt-12 w-full text-[#1E1E1E] dark:text-white">
                    <motion.div
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
                          initial={{ y: '40%', opacity: 0 }}
                          animate={{ y: '0%', opacity: 1 }}
                          transition={{
                            duration: 0.9,
                            delay: rolesDelay,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                          className="flex flex-col gap-1 items-start"
                        >
                          <NewlyRole label={roleLabel(t.designAt, fromT.designAt)} />
                          <FigmaRole label={roleLabel(t.campusLeaderAt, fromT.campusLeaderAt)} />
                          <TextQLRole label={roleLabel(t.prevDesignAt, fromT.prevDesignAt)} />
                        </motion.div>
                      ) : (
                        <div className="opacity-0 flex flex-col gap-1 items-start">
                          <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Design at Newly</p>
                        </div>
                      )}
                    </motion.div>

                    {/* Time + footer toggle arrows */}
                    <div className="flex flex-col items-end justify-between self-stretch">
                      <motion.div
                        className="flex items-center justify-end gap-1.5 whitespace-nowrap"
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
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

                      <motion.div
                        initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                        animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                        transition={{
                          duration: 0.5,
                          delay: arrowsDelay + 0.5,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                      >
                        {showContent ? (
                          <motion.button
                            type="button"
                            onClick={toggleFooter}
                            aria-expanded={footerOpen}
                            aria-label={footerOpen ? 'Hide footer' : 'Show footer'}
                            className="font-medium text-[12px] tracking-[-0.24px] leading-normal cursor-pointer p-0"
                            initial={{ y: '40%', opacity: 0 }}
                            animate={{ y: '0%', opacity: 1 }}
                            transition={{
                              duration: 0.9,
                              delay: arrowsDelay,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                          >
                            {[0, 1].map((i) => (
                              <motion.span
                                key={i}
                                className="inline-block"
                                animate={{ rotate: footerOpen ? 180 : 0 }}
                                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                              >
                                ↑
                              </motion.span>
                            ))}
                          </motion.button>
                        ) : (
                          <span className="opacity-0 font-medium text-[12px] tracking-[-0.24px] leading-normal">↑↑</span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Section - lives below the fold, revealed by the arrows */}
        <div
          ref={footerRef}
          className="relative flex flex-col gap-12 p-6 w-full text-[#1E1E1E] dark:text-white"
        >
          <div className="max-w-[354px] font-normal text-[12px] tracking-[-0.24px] leading-normal">
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
          <div className="flex items-end justify-between w-full">
            <div className="w-[45px] h-[28px] shrink-0">
              <Image
                src="/wz-logo.svg"
                alt="WZ"
                width={45}
                height={28}
                className="w-full h-full object-contain dark:invert"
              />
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
          </div>
        </div>
      </motion.div>
    </div>
  );
}
