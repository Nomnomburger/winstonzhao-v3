'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { urlFor } from '../../../sanity/lib/image';
import {
  projectHref,
  selectFeaturedProjects,
  type ProjectSummary,
} from '../../../sanity/lib/projects';
import { SITE } from '@/lib/site';
import NewlyIcon from '../icons/NewlyIcon';
import FigmaIcon from '../icons/FigmaIcon';
import GlobeIcon from '../icons/GlobeIcon';

const EASE = [0.4, 0, 0.2, 1] as const;

const BIO_LINES = [
  'product designer',
  'blending form and function',
  'currently in toronto',
  'studying at ocad',
];

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
        ease: EASE,
      }}
    >
      <motion.span
        className="inline-block"
        initial={{ y: movement, opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          duration: 0.9,
          delay,
          ease: EASE,
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

function AnimatedText({
  children,
  baseDelay = 0,
  staggerDelay = 0.08,
  className = '',
  movement = '40%',
}: AnimatedTextProps) {
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

interface RevealBlockProps {
  children: React.ReactNode;
  delay: number;
  className?: string;
}

/** Same clip + rise reveal as AnimatedWord, applied to a whole block. */
function RevealBlock({ children, delay, className = '' }: RevealBlockProps) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
      animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
      transition={{ duration: 0.5, delay: delay + 0.5, ease: EASE }}
    >
      <motion.div
        initial={{ y: '40%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Live clock in the configured time zone, e.g. "Toronto 3:37 PM". */
function useCurrentTime() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: SITE.timeZone,
    });
    const updateTime = () => {
      setTime(`${SITE.timeLabel} ${formatter.format(new Date())}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

/**
 * Placement of the featured cards in the 3-column grid. Every group of four
 * projects repeats the pattern from the design:
 *   row 1: wide card in columns 1–2
 *   row 2: standard card in column 3
 *   row 3: standard card in column 1, wide card in columns 2–3
 */
function featuredPlacement(index: number) {
  const group = Math.floor(index / 4);
  const firstRow = group * 3 + 1;
  switch (index % 4) {
    case 0:
      return { gridRow: firstRow, gridColumn: '1 / span 2', wide: true };
    case 1:
      return { gridRow: firstRow + 1, gridColumn: '3', wide: false };
    case 2:
      return { gridRow: firstRow + 2, gridColumn: '1', wide: false };
    default:
      return { gridRow: firstRow + 2, gridColumn: '2 / span 2', wide: true };
  }
}

function cardImageUrl(project: ProjectSummary, wide: boolean): string | null {
  if (!project.coverImage) return null;
  const builder = urlFor(project.coverImage).fit('crop').auto('format');
  // 2x the rendered size at 1280px wide: 560×397.5 (wide) and 386.67×398 (standard).
  return wide
    ? builder.width(1172).height(832).url()
    : builder.width(774).height(796).url();
}

interface HomePanelProps {
  showContent?: boolean;
  projects?: ProjectSummary[];
}

export default function HomePanel({ showContent = true, projects = [] }: HomePanelProps) {
  const router = useRouter();
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

  // "say hi" appears first, relative to when the shrink happens
  const sayHiDelay = contentBaseDelay;

  // Bio section - starts after a pause, then flows continuously
  const bioPause = 0.5;
  const bioStartDelay = sayHiDelay + 2 * stagger + bioPause;
  const bioDelays = [
    bioStartDelay,
    bioStartDelay + 2 * bioStagger,
    bioStartDelay + 6 * bioStagger,
    bioStartDelay + 10 * bioStagger,
  ];

  // Icon, roles and time appear after the bio
  const iconDelay = bioDelays[3];
  const rolesDelay = bioDelays[3] + 4 * bioStagger;
  const timeDelay = rolesDelay + 0.05;
  const navDelay = contentBaseDelay + 0.1;
  const sectionsDelay = rolesDelay + 0.3;

  const featuredProjects = selectFeaturedProjects(projects);

  return (
    <div className="bg-white dark:bg-[#1E1E1E] text-[#1E1E1E] dark:text-white flex flex-col gap-9 items-start min-h-screen w-full">
      {/* Header */}
      <div className="flex flex-col items-start p-9 w-full">
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
              className="font-medium whitespace-nowrap leading-none"
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

            {/* Work / Contact / Resume - appears after shrink */}
            <AnimatePresence>
              {hasShrunk && showContent && (
                <motion.nav
                  className="flex gap-4 items-center text-[14px] leading-[normal] tracking-[-0.28px] whitespace-nowrap"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: navDelay,
                    ease: EASE,
                  }}
                  aria-label="Header navigation"
                >
                  <button
                    type="button"
                    onClick={() => router.push('/projects')}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    Work
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/contact')}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    Contact
                  </button>
                  <a
                    href={SITE.resume}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    Resume
                  </a>
                </motion.nav>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bio */}
          <AnimatePresence>
            {hasShrunk && (
              <motion.div
                className="flex flex-col gap-12 items-start w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* say hi + bio lines - 3 column grid */}
                <div className="grid grid-cols-3 gap-x-6 items-start w-full">
                  <a
                    href={SITE.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="col-start-1 flex gap-2 items-start justify-self-start font-medium whitespace-nowrap cursor-pointer"
                  >
                    <span className="text-[64px] leading-none tracking-[-2.56px]">
                      <AnimatedText baseDelay={sayHiDelay} staggerDelay={stagger}>
                        say hi
                      </AnimatedText>
                    </span>
                    <span className="text-[20px] leading-[normal] tracking-[-0.4px]">
                      <AnimatedText baseDelay={sayHiDelay + 2 * stagger} staggerDelay={stagger}>
                        LNKD
                      </AnimatedText>
                    </span>
                  </a>

                  <div className="col-start-2 col-end-4 flex items-start justify-between">
                    <div className="font-medium leading-none text-[64px] whitespace-nowrap tracking-[-2.56px]">
                      {BIO_LINES.map((line, index) => (
                        <p key={line} className="mb-0">
                          <AnimatedText baseDelay={bioDelays[index]} staggerDelay={bioStagger}>
                            {line}
                          </AnimatedText>
                        </p>
                      ))}
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => router.push('/about')}
                      className="w-9 h-9 shrink-0 cursor-pointer"
                      aria-label="About"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.8,
                        delay: iconDelay,
                        ease: EASE,
                      }}
                    >
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 36 36"
                        fill="none"
                        className="animate-spin-slow"
                        aria-hidden="true"
                      >
                        <path d="M0 18L36 18" stroke="currentColor" strokeWidth="2" />
                        <path d="M18 0V36" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Roles + time - 3 column grid */}
                <div className="grid grid-cols-3 gap-x-6 items-start w-full text-[14px] leading-[normal] tracking-[-0.28px]">
                  <RevealBlock delay={rolesDelay} className="col-start-2 justify-self-start">
                    <div className="flex gap-3 items-center whitespace-nowrap">
                      <span className="flex gap-0.5 items-center">
                        <span>Design at</span>
                        <span className="flex w-[18px] shrink-0 items-center justify-center self-stretch">
                          <NewlyIcon className="w-[14px] h-[10.682px]" />
                        </span>
                        <span>Newly</span>
                      </span>
                      <span className="flex gap-px items-center">
                        <span>Campus Leader at</span>
                        <span className="flex w-[18px] shrink-0 items-center justify-center self-stretch">
                          <FigmaIcon className="w-[8.727px] h-[12.583px]" />
                        </span>
                        <span>Figma</span>
                      </span>
                    </div>
                  </RevealBlock>

                  <RevealBlock delay={timeDelay} className="col-start-3 justify-self-end">
                    <div className="flex gap-1.5 items-center whitespace-nowrap">
                      <span>{currentTime}</span>
                      <GlobeIcon className="size-3 shrink-0" />
                    </div>
                  </RevealBlock>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Featured grid, project list and footer fade in once the header has settled */}
      <motion.div
        className="flex flex-col gap-9 items-start w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: hasShrunk ? 1 : 0 }}
        transition={{ duration: 0.6, delay: hasShrunk ? sectionsDelay : 0, ease: EASE }}
      >
        {/* Featured projects - 3 column grid */}
        {featuredProjects.length > 0 && (
          <section className="grid grid-cols-3 gap-6 p-9 w-full" aria-label="Featured projects">
            {featuredProjects.map((project, index) => {
              const { gridRow, gridColumn, wide } = featuredPlacement(index);
              const imageUrl = cardImageUrl(project, wide);

              return (
                <Link
                  key={project._id}
                  href={projectHref(project)}
                  style={{ gridRow, gridColumn }}
                  className={`flex flex-col gap-4 items-start ${
                    wide ? 'w-[560px] max-w-full justify-self-start' : 'w-full'
                  }`}
                >
                  <div
                    className={`relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${
                      wide ? 'aspect-[586/416]' : 'aspect-[386.67/398]'
                    }`}
                  >
                    {imageUrl && (
                      <Image
                        src={imageUrl}
                        alt={project.title}
                        fill
                        className="object-cover"
                        sizes={wide ? '560px' : '(min-width: 1280px) 387px, 33vw'}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 items-start w-full text-[14px] leading-[normal] tracking-[-0.28px]">
                    <p className="flex-1 min-w-px text-justify">{project.title}</p>
                    {project.year && (
                      <p className="shrink-0 text-right whitespace-nowrap">{project.year}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Project list - titles/years on the left, descriptions on the right */}
        {projects.length > 0 && (
          <section className="flex flex-col items-start justify-center p-9 w-full" aria-label="All projects">
            <div className="flex gap-24 items-center w-full text-[14px] leading-[normal]">
              <div className="flex flex-1 min-w-px flex-col gap-2 items-center justify-center">
                {projects.map((project) => (
                  <Link
                    key={project._id}
                    href={projectHref(project)}
                    className="flex items-start justify-between w-full hover:opacity-70 transition-opacity"
                  >
                    <p className="flex-1 min-w-px truncate">{project.title}</p>
                    <p className="shrink-0 text-right whitespace-nowrap font-[450]">{project.year}</p>
                  </Link>
                ))}
              </div>
              <div className="flex flex-1 min-w-px flex-col gap-2 items-center justify-center">
                {projects.map((project) => (
                  <Link
                    key={project._id}
                    href={projectHref(project)}
                    className="flex items-start justify-between w-full hover:opacity-70 transition-opacity"
                  >
                    <p className="flex-1 min-w-px truncate font-[450]">
                      {project.tagline || project.description}
                    </p>
                    <p className="shrink-0 text-right whitespace-nowrap">Learn More ↗</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="flex h-[239px] items-end justify-between p-9 w-full">
          <div className="flex gap-6 items-center w-[717px] max-w-full">
            <Image
              src="/images/logo.png"
              alt={SITE.name}
              width={45}
              height={28}
              className="h-7 w-[45px] shrink-0 object-contain dark:invert"
            />
            <div className="w-[354px] max-w-full text-[14px] leading-[normal] tracking-[-0.28px]">
              <p className="mb-0">I’m in the process of creating a new portfolio.</p>
              <p>
                Check back soon, or{' '}
                <a
                  href={SITE.oldSite}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:opacity-70 transition-opacity"
                >
                  visit the old site
                </a>
                .
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center justify-end text-[12px] leading-[normal] tracking-[-0.24px] whitespace-nowrap">
            <a href={`mailto:${SITE.email}`} className="hover:opacity-70 transition-opacity">
              {SITE.emailDisplay}
            </a>
            <a
              href={SITE.resume}
              target="_blank"
              rel="noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              RESUME
            </a>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
