'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Placeholder targets — update with the real URLs
const LINKEDIN_URL = 'https://www.linkedin.com/in/zhaowinston/?skipRedirect=true';
const OLD_SITE_URL = 'https://winstonzhao.ca';
const RESUME_URL = '/resume.pdf';
const EMAIL = 'hello@winstonzhao.ca';

interface AnimatedWordProps {
  children: string;
  delay: number;
  movement?: string;
}

function AnimatedWord({ children, delay, movement = '40%' }: AnimatedWordProps) {
  return (
    <motion.span
      className="inline-block align-bottom"
      initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
      animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
      transition={{
        duration: 0.5,
        delay: delay + 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.span
        className="inline-block"
        initial={{ y: movement, opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          duration: 0.9,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

interface AnimatedTextProps {
  children: string;
  baseDelay?: number;
  staggerDelay?: number;
  className?: string;
  movement?: string;
}

function AnimatedText({ children, baseDelay = 0, staggerDelay = 0.08, className = '', movement = '40%' }: AnimatedTextProps) {
  const words = children.split(' ');

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={index}>
          <AnimatedWord delay={baseDelay + index * staggerDelay} movement={movement}>
            {word}
          </AnimatedWord>
          {index < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
}

function useCurrentTime() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Europe/Stockholm',
    });

    const updateTime = () => {
      setTime(`STHLM ${formatter.format(new Date())}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

interface HomePanelProps {
  showContent?: boolean;
}

export default function HomePanel({ showContent = true }: HomePanelProps) {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('220.84px');
  const [hasShrunk, setHasShrunk] = useState(false);
  const currentTime = useCurrentTime();

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

  return (
    <div className="bg-background flex flex-col gap-9 h-screen w-full relative overflow-hidden">
      {/* Background column guides - same grid as the page content */}
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

      {/* Header Section */}
      <div className="relative flex flex-col items-start p-9 w-full">
        <div className="flex flex-col gap-9 items-start w-full">
          {/* Header Content */}
          <motion.div
            ref={containerRef}
            className="flex items-start justify-between w-full"
            animate={{
              height: hasShrunk ? '128px' : 'auto',
            }}
            transition={{
              duration: shrinkDuration,
              ease: [0.76, 0, 0.15, 1],
            }}
          >
            <motion.h1
              ref={headerRef}
              className="font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap leading-none"
              animate={{
                fontSize: hasShrunk ? '128px' : fontSize,
                paddingTop: hasShrunk ? '8px' : '0px',
              }}
              transition={{
                duration: shrinkDuration,
                ease: [0.76, 0, 0.15, 1],
              }}
              style={{
                letterSpacing: '-0.05em',
                marginTop: '-0.15em',
                marginBottom: '-0.1em',
              }}
            >
              {showContent && (
                <AnimatedText baseDelay={headerDelay} staggerDelay={stagger}>
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: languagesDelay,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <p>EN</p>
                  <p>SV</p>
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
                initial={{ opacity: 0 }}
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
                        className="text-[64px] leading-none tracking-[-2.56px]"
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
                        className="text-[20px] leading-normal tracking-[-0.4px]"
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
                  </div>

                  {/* Column 2: Empty */}
                  <div className="col-span-1" />

                  {/* Columns 3-5: Bio */}
                  <div className="col-span-3 flex items-start justify-between">
                    <div className="font-medium leading-none text-[64px] text-[#1E1E1E] dark:text-white whitespace-nowrap tracking-[-2.56px]">
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

                {/* Roles and Time - 5 Column Grid */}
                <div className="grid grid-cols-5 gap-x-6 items-center w-full text-[#1E1E1E] dark:text-white">
                  {/* Columns 1-2: Empty */}
                  <div className="col-span-2" />

                  {/* Columns 3-4: Roles */}
                  <motion.div
                    className="col-span-2"
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
                        className="flex gap-4 items-center"
                      >
                        <div className="flex gap-1.5 items-center">
                          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                            <svg viewBox="0 0 692 528" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Newly" role="img" className="w-full h-auto">
                              <path d="M528.018 109.224C528.018 139.39 552.469 163.842 582.636 163.842H637.269C667.436 163.842 691.888 188.294 691.888 218.461V473.371C691.888 503.538 667.436 527.99 637.269 527.99H564.439C534.272 527.99 509.821 503.538 509.821 473.371V236.672C509.821 206.505 485.369 182.053 455.202 182.053H236.686C206.519 182.053 182.067 206.505 182.067 236.672V473.371C182.067 503.538 157.615 527.99 127.448 527.99H54.6187C24.4518 527.99 0 503.538 0 473.371V218.475C0 188.308 24.4518 163.856 54.6187 163.856H109.237C139.404 163.856 163.856 139.404 163.856 109.237V54.6187C163.856 24.4518 188.308 0 218.475 0H473.385C503.552 0 528.004 24.4518 528.004 54.6187V109.224H528.018Z" fill="currentColor"/>
                              <path d="M282.199 292.993C307.343 292.993 327.712 326.619 327.712 368.105C327.712 368.977 327.698 369.849 327.685 370.721C327.491 379.729 319.7 386.316 310.691 386.316H253.693C244.684 386.316 236.893 379.715 236.7 370.721C236.686 369.849 236.672 368.991 236.672 368.105C236.686 326.633 257.069 292.993 282.199 292.993Z" fill="currentColor"/>
                              <path d="M409.661 292.993C434.804 292.993 455.174 326.619 455.174 368.105C455.174 368.977 455.16 369.849 455.146 370.721C454.952 379.729 447.162 386.316 438.153 386.316H381.154C372.146 386.316 364.355 379.715 364.161 370.721C364.147 369.849 364.134 368.991 364.134 368.105C364.134 326.633 384.517 292.993 409.661 292.993Z" fill="currentColor"/>
                            </svg>
                          </div>
                          <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Design at <a href="https://newly.app" target="_blank" rel="noopener noreferrer" className="hover:underline">Newly</a></p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                            <svg viewBox="0 0 125 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Figma" role="img" className="h-[11.5px] w-auto">
                              <path fillRule="evenodd" clipRule="evenodd" d="M15.2907 61.8108C6.08543 55.8127 0 45.4277 0 33.6214C0 15.0528 15.0528 0 33.6214 0H91.2255C109.794 0 124.847 15.0528 124.847 33.6214C124.847 45.4277 118.761 55.8127 109.556 61.8108C118.761 67.809 124.847 78.194 124.847 90.0003C124.847 108.569 109.794 123.622 91.2255 123.622H90.6127C81.8351 123.622 73.8432 120.258 67.8555 114.749V146.072C67.8555 164.848 52.4734 180 33.7737 180C15.2433 180 0 164.985 0 146.379C0 134.573 6.0852 124.188 15.2902 118.189C6.0852 112.191 0 101.806 0 90.0003C0 78.194 6.08543 67.809 15.2907 61.8108ZM67.8555 90.0003C67.8555 102.569 78.0443 112.757 90.6127 112.757H91.2255C103.794 112.757 113.983 102.569 113.983 90.0003C113.983 77.4319 103.794 67.2432 91.2255 67.2432H90.6127C78.0443 67.2432 67.8555 77.4319 67.8555 90.0003ZM56.9913 67.2432H33.6214C21.0529 67.2432 10.8642 77.4319 10.8642 90.0003C10.8642 102.543 21.0116 112.716 33.5449 112.757L33.5805 112.757L56.9913 112.757V67.2432ZM33.6214 123.622C33.5959 123.622 33.5704 123.622 33.5449 123.622C21.0117 123.663 10.8642 133.836 10.8642 146.379C10.8642 158.909 21.1671 169.136 33.7737 169.136C46.5496 169.136 56.9913 158.772 56.9913 146.072V123.622H33.6214ZM56.9913 56.3785H33.6214C21.0529 56.3785 10.8642 46.1898 10.8642 33.6214C10.8642 21.0529 21.0529 10.8642 33.6214 10.8642H56.9913V56.3785ZM91.2255 56.3785H67.8555V10.8642H91.2255C103.794 10.8642 113.983 21.0529 113.983 33.6214C113.983 46.1898 103.794 56.3785 91.2255 56.3785Z" fill="currentColor"/>
                            </svg>
                          </div>
                          <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Campus Leader at <a href="https://figma.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Figma</a></p>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                            <svg viewBox="98 141 305 218" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="TextQL" role="img" className="w-full h-auto">
                              <path d="M136.998 141.347C157.539 140.877 180.058 141.16 200.686 141.292C204.975 148.107 213.145 158.368 218.152 165.05L249.186 206.462L314.547 293.745L343.742 332.685C350.13 341.187 357.02 350.067 363.127 358.697L299.318 358.747C297.953 356.017 293.937 351.122 291.99 348.497C287.857 342.887 283.685 337.31 279.473 331.762L252.503 295.822C249.98 292.485 246.843 288.185 244.355 284.695C244.186 284.662 244.017 284.627 243.849 284.595C238.172 289.412 231.973 295.305 226.39 300.365L198.862 325.177L175.602 346.12C170.981 350.257 166.076 354.485 161.624 358.772L98.1503 358.677C101.227 355.602 105.279 352.27 108.573 349.287C116.636 341.957 124.737 334.67 132.874 327.422L191.961 273.957L208.658 258.93C211.741 256.147 215.195 253.167 218.097 250.24C216.159 247.057 213.018 243.041 210.734 239.99L197.592 222.578L158.583 170.441L145.483 152.9C142.794 149.316 139.406 145.052 136.998 141.347Z" fill="currentColor"/>
                              <path d="M398.927 158.202C399.012 158.342 399.1 158.482 399.185 158.623C392.512 196.114 378.977 271.345 372.935 304.98C371.28 313.715 369.715 322.468 368.24 331.235C367.48 335.555 366.248 341.385 365.883 345.618C361.693 339.13 355.632 331.313 350.862 325.1L338.715 308.795C336.362 305.623 332.647 300.345 330.025 297.585C330.225 294.043 331.203 289.348 331.853 285.718L335.19 267.043L342.625 225.874C343.065 223.461 345.627 206.893 346.622 205.898C351.32 201.191 357.8 195.591 362.835 191.068L398.927 158.202Z" fill="currentColor"/>
                              <path d="M134.233 155.568C135.515 156.283 140.487 163.303 141.638 164.849L159.679 189.027C162.177 192.4 167.835 200.364 170.344 202.943C167.945 219.424 164.308 237.41 161.325 253.932L156.279 282.007C155.887 284.145 154.644 293.067 153.689 294.22C151.335 297.06 147.028 300.537 144.144 303.147L120.523 324.427C113.929 330.215 107.631 336.3 100.862 341.96C101.587 339.24 102.302 334.567 102.828 331.692L106.499 311.262L116.738 254.352L127.511 194.189C129.722 182.083 132.665 167.692 134.233 155.568Z" fill="currentColor"/>
                              <path d="M339.3 141.357C345.492 141.146 352.135 141.258 358.355 141.257C373.085 141.315 387.815 141.296 402.543 141.199L309.345 225.583C302.703 231.481 296.24 237.473 289.535 243.365C288.28 241.535 286.8 239.522 285.44 237.775C278.173 228.432 271.377 218.174 263.802 209.132C268.3 204.675 274.372 199.668 279.175 195.321L313.372 164.485L329.465 149.932C331.805 147.793 336.88 142.925 339.3 141.357Z" fill="currentColor"/>
                            </svg>
                          </div>
                          <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">Prev. Design at <a href="https://textql.com" target="_blank" rel="noopener noreferrer" className="hover:underline">TextQL</a></p>
                        </div>
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
            className="relative flex flex-1 items-end justify-between p-9 w-full text-[#1E1E1E] dark:text-white"
            initial={{ opacity: 0, y: 20 }}
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
            </div>
            <div className="flex gap-3 items-center justify-end font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">
              <a href={`mailto:${EMAIL}`}>hello [at] winstonzhao.ca</a>
              <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">resume</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
