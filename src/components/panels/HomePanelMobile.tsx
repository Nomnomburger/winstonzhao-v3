'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatedText,
  useCurrentTime,
  NewlyRole,
  FigmaRole,
  TextQLRole,
  LINKEDIN_URL,
  OLD_SITE_URL,
  RESUME_URL,
  EMAIL,
} from './shared';

// "Zhao" sits in the second of the two mobile grid columns: half the
// container width plus half the 12px column gap (~51.7% of the row).
const ZHAO_COLUMN_OFFSET = '51.7%';

interface HomePanelMobileProps {
  showContent?: boolean;
}

export default function HomePanelMobile({ showContent = true }: HomePanelMobileProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('96px');
  const [hasShrunk, setHasShrunk] = useState(false);
  const currentTime = useCurrentTime();

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

  // Timing configuration
  const headerAnimationDelay = 0.2; // When header starts appearing
  const shrinkDelay = 1.3; // Seconds after page load to start shrinking
  const shrinkDuration = 0.8; // Duration of shrink animation

  // Trigger shrink after delay
  useEffect(() => {
    if (!showContent) return;
    const timer = setTimeout(() => {
      setHasShrunk(true);
    }, shrinkDelay * 1000);
    return () => clearTimeout(timer);
  }, [showContent]);

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
  const globeDelay = contentBaseDelay + 0.1;
  const footerDelay = rolesDelay + 0.1;

  return (
    <div className="bg-background flex flex-col gap-9 min-h-dvh w-full relative">
      {/* Background column guides - 2 column mobile grid */}
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

      {/* Header Section */}
      <div className="relative flex flex-col flex-1 items-start p-6 w-full">
        <div className="flex flex-col flex-1 gap-12 items-start w-full">
          {/* Header Content */}
          <div ref={containerRef} className="relative w-full py-1">
            <motion.h1
              ref={headerRef}
              className="font-medium text-[#1E1E1E] dark:text-white leading-none w-full"
              animate={{
                fontSize: hasShrunk ? '64px' : fontSize,
              }}
              transition={{
                duration: shrinkDuration,
                ease: [0.76, 0, 0.15, 1],
              }}
              style={{
                letterSpacing: '-0.05em',
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
                className="block whitespace-nowrap mt-4"
                animate={{
                  paddingLeft: hasShrunk ? ZHAO_COLUMN_OFFSET : '0%',
                }}
                transition={{
                  duration: shrinkDuration,
                  ease: [0.76, 0, 0.15, 1],
                }}
              >
                {showContent ? (
                  <AnimatedText baseDelay={headerDelay + stagger} staggerDelay={stagger}>
                    Zhao
                  </AnimatedText>
                ) : (
                  <span className="opacity-0">Zhao</span>
                )}
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
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Language" role="img">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
                    <path d="M1.5 8H14.5" stroke="currentColor" />
                    <path d="M8 1.5C9.8 3.3 10.75 5.55 10.75 8C10.75 10.45 9.8 12.7 8 14.5C6.2 12.7 5.25 10.45 5.25 8C5.25 5.55 6.2 3.3 8 1.5Z" stroke="currentColor" />
                  </svg>
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
                    <p className="mb-0">
                      {showContent ? (
                        <AnimatedText baseDelay={bio1Delay} staggerDelay={0.03}>
                          product designer
                        </AnimatedText>
                      ) : (
                        <span className="opacity-0">product designer</span>
                      )}
                    </p>
                    <p className="mb-0">
                      {showContent ? (
                        <AnimatedText baseDelay={bio2Delay} staggerDelay={0.03}>
                          blending form and function
                        </AnimatedText>
                      ) : (
                        <span className="opacity-0">blending form and function</span>
                      )}
                    </p>
                    <p className="mb-0">
                      {showContent ? (
                        <AnimatedText baseDelay={bio3Delay} staggerDelay={0.03}>
                          currently in stockholm
                        </AnimatedText>
                      ) : (
                        <span className="opacity-0">currently in stockholm</span>
                      )}
                    </p>
                    <p>
                      {showContent ? (
                        <AnimatedText baseDelay={bio4Delay} staggerDelay={0.03}>
                          building at newly
                        </AnimatedText>
                      ) : (
                        <span className="opacity-0">building at newly</span>
                      )}
                    </p>
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
                        {showContent ? (
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
                            say hi
                          </motion.span>
                        ) : (
                          <span className="opacity-0">say hi</span>
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
                        className="w-9 h-9 shrink-0 text-[#1E1E1E] dark:text-white"
                        initial={{ opacity: 0, scale: 0.8 }}
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

                {/* Spacer - keeps the Figma frame's gap above the roles row,
                    but stretches on tall screens to pin the footer down */}
                <div className="flex-1 min-h-40" aria-hidden="true" />

                {/* Roles and Time */}
                <div className="flex items-start justify-between w-full text-[#1E1E1E] dark:text-white">
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
                        className="flex flex-col gap-2 items-start"
                      >
                        <NewlyRole />
                        <FigmaRole />
                        <TextQLRole />
                      </motion.div>
                    ) : (
                      <div className="opacity-0 flex flex-col gap-2 items-start">
                        <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Design at Newly</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Time */}
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
                        <span className="font-medium text-[12px] tracking-[-0.24px] leading-normal">{currentTime}</span>
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
            className="relative flex flex-col gap-12 p-6 w-full text-[#1E1E1E] dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: footerDelay,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <div className="max-w-[354px] font-normal text-[12px] tracking-[-0.24px] leading-normal">
              <p className="mb-0">I&rsquo;m in the process of creating a new portfolio.</p>
              <p>
                Check back soon, or{' '}
                <a
                  href={OLD_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  visit the old site
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
                <Link href={RESUME_URL}>resume</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
