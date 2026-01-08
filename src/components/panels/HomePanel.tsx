'use client';

import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return mousePosition;
}

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
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setTime(`Toronto ${displayHours}:${minutes} ${period}`);
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
  const router = useRouter();
  const headerRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState('220.84px');
  const [hasShrunk, setHasShrunk] = useState(false);
  const currentTime = useCurrentTime();
  const mousePosition = useMousePosition();
  const [flowerAnimationDone, setFlowerAnimationDone] = useState(false);

  // Smooth spring value for flower sway (2D rotation)
  const rotate = useMotionValue(0);
  const springRotate = useSpring(rotate, { stiffness: 100, damping: 15 });

  // Update flower sway based on mouse position
  useEffect(() => {
    if (!flowerAnimationDone) return;
    
    const windowWidth = window.innerWidth;
    
    // Calculate rotation based on horizontal mouse position (-5 to 5 degrees)
    const rotation = ((mousePosition.x / windowWidth) - 0.5) * 10;
    
    rotate.set(rotation);
  }, [mousePosition, flowerAnimationDone, rotate]);

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
  const projectsDelay = contentBaseDelay;
  
  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.5;
  const bioStartDelay = projectsDelay + 2 * stagger + bioPause;
  
  // Bio lines flow continuously with tight timing
  const bio1Delay = bioStartDelay;
  const bio2Delay = bioStartDelay + 2 * bioStagger;
  const bio3Delay = bioStartDelay + 6 * bioStagger;
  const bio4Delay = bioStartDelay + 10 * bioStagger;
  
  // Icon and roles appear after bio
  const iconDelay = bio4Delay;
  const rolesDelay = bio4Delay + 4 * bioStagger;
  const timeDelay = rolesDelay + 0.05;
  const flowerDelay = timeDelay + 0.5;
  const resumeDelay = contentBaseDelay + 0.1;

  // Set flower animation done after the drawing completes
  useEffect(() => {
    if (!showContent || !hasShrunk) return;
    // flowerDelay + 3.5 (last path delay) + 1.8 (last path duration) = total time
    const totalFlowerTime = (flowerDelay + 5.3) * 1000;
    const timer = setTimeout(() => setFlowerAnimationDone(true), totalFlowerTime);
    return () => clearTimeout(timer);
  }, [showContent, hasShrunk, flowerDelay]);

  return (
    <div className="bg-white dark:bg-[#1E1E1E] flex flex-col items-center justify-between min-h-screen w-full relative">
      {/* Subtle radial gradient at bottom */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 50% at 50% 100%, rgba(121, 164, 199, 0.1) 0%, rgba(176, 177, 147, 0.05) 50%, rgba(231, 189, 95, 0) 100%)',
        }}
      />
      <div className="flex flex-col items-start grow p-6 w-full">
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
            
            {/* Download Resume Button - appears after shrink */}
            <AnimatePresence>
              {hasShrunk && showContent && (
                <motion.button
                  className="font-medium text-[14px] text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: resumeDelay,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  download resume ↓
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Projects and Bio Section - 5 Column Grid */}
          <AnimatePresence>
            {hasShrunk && (
              <motion.div 
                className="grid grid-cols-5 gap-6 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Column 1: Projects Button */}
                <div className="col-span-1">
                  <button
                    onClick={() => router.push('/projects')}
                    className="flex gap-2 items-start font-medium text-[#1E1E1E] dark:text-white whitespace-nowrap cursor-pointer"
                  >
                    <motion.span 
                      className="text-[20px] leading-normal"
                      initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                      animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                      transition={{
                        duration: 0.5,
                        delay: projectsDelay + 0.5,
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
                            delay: projectsDelay,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        >
                          16
                        </motion.span>
                      ) : (
                        <span className="opacity-0">16</span>
                      )}
                    </motion.span>
                    <motion.span 
                      className="text-[64px] leading-none tracking-[-2.56px]"
                      initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
                      animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
                      transition={{
                        duration: 0.5,
                        delay: projectsDelay + stagger + 0.5,
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
                            delay: projectsDelay + stagger,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        >
                          projects ↗
                        </motion.span>
                      ) : (
                        <span className="opacity-0">projects ↗</span>
                      )}
                    </motion.span>
                  </button>
                </div>

                {/* Column 2: Empty */}
                <div className="col-span-1" />

                {/* Columns 3-5: Bio Section */}
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
                          currently studying at the
                        </AnimatedText>
                      ) : (
                        <span className="opacity-0">currently studying at the</span>
                      )}
                    </p>
                    <p>
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
                        ease: [0.4, 0, 0.2, 1],
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Roles and Time Section - 5 Column Grid */}
          <AnimatePresence>
            {hasShrunk && (
              <motion.div 
                className="grid grid-cols-5 gap-6 items-end w-full font-medium text-[14px] text-[#1E1E1E] dark:text-white leading-tight mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Columns 1-2: Empty */}
                <div className="col-span-2" />

                {/* Column 3: Roles */}
                <motion.div 
                  className="col-span-1"
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
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0">
                          <Image
                            src="/Yelo Icon.png"
                            alt="Yelo"
                            width={16}
                            height={16}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="leading-tight">Product Design @ Yelo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0">
                          <Image
                            src="/Figma App Icon.png"
                            alt="Figma"
                            width={16}
                            height={16}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="leading-tight">Campus Leader @ Figma</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="opacity-0 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0">
                          <Image
                            src="/Yelo Icon.png"
                            alt="Yelo"
                            width={16}
                            height={16}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="leading-tight">Product Design @ Yelo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0">
                          <Image
                            src="/Figma App Icon.png"
                            alt="Figma"
                            width={16}
                            height={16}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="leading-tight">Campus Leader @ Figma</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Column 4: Empty */}
                <div className="col-span-1" />

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
                      <span className="leading-none">{currentTime}</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E] dark:bg-white shrink-0 self-center" />
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-1.5 opacity-0">
                      <span className="leading-none">{currentTime}</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E] dark:bg-white shrink-0 self-center" />
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Flower - Absolute position, bottom left of home panel */}
      <AnimatePresence>
        {showContent && hasShrunk && (
          <motion.div 
            className="absolute left-12 bottom-20 h-[20vh] sm:h-[25vh] md:h-[30vh] lg:h-[35vh] w-auto pointer-events-none overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <svg
            viewBox="0 0 82 267"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-auto text-[#1E1E1E] dark:text-white overflow-visible"
          >
          {/* Swaying group - flower head, petal, and stem */}
          <motion.g
            style={{
              rotate: springRotate,
              originX: '42px',
              originY: '267px',
            }}
          >
            {/* Small petal - draws second (after main flower head) */}
            <motion.path 
              d="M34.2297 34.8757C34.1212 34.981 34.7771 36.4603 36.398 38.9642C37.8465 41.2017 41.7558 41.5576 45.2503 41.111C47.5358 40.8188 46.8754 36.61 46.6137 33.8516C46.4848 32.4928 45.8286 31.2944 44.923 30.478C44.0174 29.6617 42.7455 29.2834 41.5557 29.5714C40.3659 29.8593 39.2967 30.8247 37.668 32.7383" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: 1,
                  delay: flowerDelay + 1.6,
                  ease: [0.4, 0, 0.2, 1],
                },
                opacity: {
                  duration: 0.01,
                  delay: flowerDelay + 1.6,
                },
              }}
            />
            {/* Main flower head - draws first */}
            <motion.path 
              d="M37.6678 32.7383C36.8476 31.2863 30.1745 24.9397 23.8528 22.3083C22.7052 21.8306 21.4114 22.7502 20.7876 23.8841C20.1639 25.0179 20.1511 26.8484 20.6185 28.2565C21.0859 29.6646 22.0338 30.595 23.1373 31.2091C25.318 32.4227 29.0336 32.3708 31.5635 33.0713C34.144 33.786 26.9999 37.6715 25.4671 39.9232C23.9948 42.086 24.9022 44.9609 26.0697 47.0104C27.2589 49.0979 30.8255 48.9027 33.7463 48.5534C36.4618 48.2287 37.9015 45.5072 38.654 45.6161C49.133 47.1322 41.0811 60.5968 43.0133 62.7404C43.9032 63.7275 45.2855 63.7748 46.4353 63.5708C47.5852 63.3669 48.6336 62.7221 49.4769 61.7732C51.2175 59.8148 51.5722 55.8989 51.2845 51.6198C51.0683 48.4041 48.7097 46.453 47.9713 45.8077C43.919 42.2665 57.7857 51.0463 74.1036 51.1632C77.5263 51.1877 78.4752 49.6269 78.9816 48.2593C79.488 46.8917 79.488 45.2416 79.0228 43.9455C77.1266 38.6623 67.3446 39.1081 56.2722 37.9868C54.4393 37.8012 58.6803 33.3334 60.8423 28.3621C62.1311 25.3987 60.5413 22.0769 59.1815 19.7715C58.4962 18.6097 57.051 18.0135 55.7002 17.6816C54.3495 17.3498 52.9404 17.4407 51.8116 18.0788C47.2962 20.6312 48.3191 26.2358 48.5024 27.3833C49.9074 36.1781 49.9959 7.02785 47.1451 1.98745C46.5153 0.873886 44.9095 0.94748 43.6205 1.06042C40.9782 1.29192 38.7924 3.05305 36.997 5.17283C34.9654 7.57151 33.9117 10.414 33.4158 12.9475C33.7353 15.8401 34.8763 18.8418 36.2507 21.7272C36.8623 23.1842 37.2995 24.6269 38.7075 27.9943" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: 1.8,
                  delay: flowerDelay,
                  ease: [0.4, 0, 0.2, 1],
                },
                opacity: {
                  duration: 0.01,
                  delay: flowerDelay,
                },
              }}
            />
            {/* Main stem - draws third */}
            <motion.path 
              d="M38.0018 48.3872C37.8933 48.3872 37.7832 53.0773 36.2416 66.9419C33.6872 89.9152 28.5283 106.29 27.6468 127.105C26.8813 145.184 26.2116 178.548 27.8511 202.893C29.4907 227.237 33.6494 241.558 36.4636 250.304C39.2778 259.05 40.6215 261.787 42.3202 265.791" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: 1.4,
                  delay: flowerDelay + 2.5,
                  ease: [0.4, 0, 0.2, 1],
                },
                opacity: {
                  duration: 0.01,
                  delay: flowerDelay + 2.5,
                },
              }}
            />
          </motion.g>
          
          {/* Static leaves - don't sway */}
          <motion.path 
            d="M41.9334 265.018C41.9334 264.248 41.8807 248.143 41.5887 223.198C41.3864 205.924 35.6588 196.905 28.4942 186.283C17.8909 170.562 9.38409 162.455 3.66933 161.423C2.44936 161.202 1.7932 163.201 1.41257 164.504C-1.26607 173.676 9.74368 204.094 15.8364 224.47C20.7238 240.814 27.3821 243.936 32.0434 247.018C37.7223 250.774 41.1964 252.873 42.8367 253.876C50.635 258.644 45.2518 230.369 49.1342 224.395C56.181 213.552 65.1788 210.865 71.0632 209.448C73.1831 208.937 76.353 209.167 78.0511 209.78C79.7493 210.393 79.9328 211.705 80.0273 213.307C80.4331 220.183 73.7411 224.995 67.7685 231.882C53.2863 250.001 49.8485 252.237 47.2464 253.032C45.8108 253.443 44.1416 253.87 40.0571 255.351" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: {
                duration: 1.8,
                delay: flowerDelay + 3.5,
                ease: [0.4, 0, 0.2, 1],
              },
              opacity: {
                duration: 0.01,
                delay: flowerDelay + 3.5,
              },
            }}
          />
          </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
