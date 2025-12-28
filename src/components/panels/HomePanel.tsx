'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface AnimatedWordProps {
  children: string;
  delay: number;
  movement?: string;
}

function AnimatedWord({ children, delay, movement = '40%' }: AnimatedWordProps) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <motion.span
        className="inline-block"
        initial={{ y: movement, opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          duration: 0.9,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.span>
    </span>
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

interface HomePanelProps {
  showContent?: boolean;
}

export default function HomePanel({ showContent = true }: HomePanelProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('220.84px');

  useEffect(() => {
    const updateFontSize = () => {
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
  }, []);

  // Animation configuration
  const baseDelay = 0.2;
  const stagger = 0.1;
  const bioStagger = 0.03; // Tighter stagger for bio section
  
  // Header section timing
  const headerDelay = baseDelay;
  const role1Delay = baseDelay + 2 * stagger; // After "Winston Zhao" (2 words)
  const projectsDelay = baseDelay + 3 * stagger; // After roles (counted as 1)
  
  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.4; // Pause before bio section starts
  const bioStartDelay = projectsDelay + 2 * stagger + bioPause; // After projects button finishes
  
  // Bio lines flow continuously with tight timing
  const bio1Delay = bioStartDelay;
  const bio2Delay = bioStartDelay + 2 * bioStagger; // After "product designer" (2 words)
  const bio3Delay = bioStartDelay + 6 * bioStagger; // After "blending form and function" (4 more words)
  const bio4Delay = bioStartDelay + 10 * bioStagger; // After "currently studying at the" (4 more words)
  
  // Icon appears with last line
  const iconDelay = bio4Delay;

  return (
    <div className="bg-white dark:bg-[#1E1E1E] flex flex-col items-center justify-between min-h-screen w-full">
      <div className="flex flex-col items-start grow p-9 w-full">
        <div className="flex flex-col gap-12 items-start w-full">
          {/* Header Content */}
          <div ref={containerRef} className="flex items-start px-0 py-2 w-full overflow-hidden">
            <h1 
              ref={headerRef}
              className="font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap leading-none"
              style={{
                fontSize: fontSize,
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
            </h1>
          </div>

          {/* Roles and Projects Section */}
          <div className="flex gap-12 items-center w-full">
            <div className="grow font-normal text-base text-[#1E1E1E] dark:text-white text-left overflow-hidden">
              {showContent ? (
                <motion.div
                  initial={{ y: '40%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{
                    duration: 0.9,
                    delay: role1Delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <p className="mb-0">Product Design @ Yelo</p>
                  <p>Campus Leader @ Figma</p>
                </motion.div>
              ) : (
                <div className="opacity-0">
                  <p className="mb-0">Product Design @ Yelo</p>
                  <p>Campus Leader @ Figma</p>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/projects')}
              className="flex gap-2 items-start font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer overflow-hidden"
            >
              <span className="text-[20px] leading-normal overflow-hidden">
                {showContent ? (
                  <motion.span
                    className="inline-block"
                    initial={{ y: '40%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 0.9,
                      delay: projectsDelay,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    16
                  </motion.span>
                ) : (
                  <span className="opacity-0">16</span>
                )}
              </span>
              <span className="text-[48px] leading-none tracking-[-2.56px] overflow-hidden">
                {showContent ? (
                  <motion.span
                    className="inline-block"
                    initial={{ y: '40%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 0.9,
                      delay: projectsDelay + stagger,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    projects ↗
                  </motion.span>
                ) : (
                  <span className="opacity-0">projects ↗</span>
                )}
              </span>
            </button>
          </div>

          {/* Bio Section */}
          <div className="flex gap-16 items-start">
            <div className="font-medium leading-none text-[48px] text-[#1E1E1E] dark:text-white whitespace-nowrap tracking-[-2.56px]">
              <p className="mb-0 overflow-hidden">
                {showContent ? (
                  <AnimatedText baseDelay={bio1Delay} staggerDelay={0.03}>
                    product designer
                  </AnimatedText>
                ) : (
                  <span className="opacity-0">product designer</span>
                )}
              </p>
              <p className="mb-0 overflow-hidden">
                {showContent ? (
                  <AnimatedText baseDelay={bio2Delay} staggerDelay={0.03}>
                    blending form and function
                  </AnimatedText>
                ) : (
                  <span className="opacity-0">blending form and function</span>
                )}
              </p>
              <p className="mb-0 overflow-hidden">
                {showContent ? (
                  <AnimatedText baseDelay={bio3Delay} staggerDelay={0.03}>
                    currently studying at the
                  </AnimatedText>
                ) : (
                  <span className="opacity-0">currently studying at the</span>
                )}
              </p>
              <p className="overflow-hidden">
                {showContent ? (
                  <AnimatedText baseDelay={bio4Delay} staggerDelay={0.03}>
                    University of Waterloo
                  </AnimatedText>
                ) : (
                  <span className="opacity-0">University of Waterloo</span>
                )}
              </p>
            </div>
            {showContent ? (
              <motion.button
                onClick={() => router.push('/about')}
                className="w-9 h-9 shrink-0 text-[#1E1E1E] dark:text-white cursor-pointer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.8,
                  delay: iconDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="animate-spin-slow">
                  <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </motion.button>
            ) : (
              <button className="w-9 h-9 shrink-0 opacity-0">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18 0V36" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
