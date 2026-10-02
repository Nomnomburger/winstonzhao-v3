'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import FeaturedProjects from './FeaturedProjects';
import ProjectList from './ProjectList';
import { RevealContext } from './reveal';
import type { ProjectCardData } from './types';

interface HomeProjectsProps {
  projects: ProjectCardData[];
  heroScrollProgress: MotionValue<number>;
  skipFirstImageReveals?: boolean;
  className?: string;
  // Scroll reveals wait for this (the end of the page's intro). When the
  // intro was skipped the once-only reveals are skipped too. Captions replay.
  revealReady?: boolean;
  // Arriving at /#work uses the hero's docking position when provided.
  introSkipped?: boolean;
  scrollToHashWhenReady?: boolean;
  onScrollToWork?: () => void;
}

// The home page's work section: projects marked "featured" in Sanity show as
// photo cards, and everything else goes in the list below them.
export default function HomeProjects({
  projects,
  heroScrollProgress,
  skipFirstImageReveals = false,
  className = '',
  revealReady = true,
  introSkipped = false,
  scrollToHashWhenReady = false,
  onScrollToWork,
}: HomeProjectsProps) {
  const ref = useRef<HTMLElement>(null);
  const [captionsActive, setCaptionsActive] = useState(() => heroScrollProgress.get() >= 0.7);
  // Replay the captions after the hero clears, and fade them out on return
  // even when the first photo is still partly visible below the hero.
  useMotionValueEvent(heroScrollProgress, 'change', (value) => {
    setCaptionsActive(value >= 0.7);
  });
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  // Wait for the intro and final layout. A native hash jump on a client
  // navigation needs the same heading clearance as a click from the hero.
  // Dropping the hash lets Back restore the visitor's later scroll position.
  useEffect(() => {
    if (window.location.hash !== '#work') return;
    // (null state: Next fills in its own and updates its router's URL too)
    const dropHash = () =>
      history.replaceState(null, '', window.location.pathname + window.location.search);
    if (introSkipped && !onScrollToWork) {
      dropHash();
      return;
    }
    if (!scrollToHashWhenReady) return;
    const nativeHashJump = introSkipped && ref.current &&
      Math.abs(ref.current.getBoundingClientRect().top) < 2;
    if (window.scrollY > 0 && !nativeHashJump) {
      dropHash();
      return;
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (onScrollToWork) onScrollToWork();
        else ref.current?.scrollIntoView();
        dropHash();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [introSkipped, scrollToHashWhenReady, onScrollToWork]);

  if (projects.length === 0) return null;

  return (
    <RevealContext.Provider value={{ ready: revealReady, skip: introSkipped, captionsActive }}>
      <section
        ref={ref}
        id="work"
        aria-label="Work"
        tabIndex={-1}
        className={`relative flex flex-col gap-12 md:gap-9 w-full focus:outline-none ${className}`}
      >
        {featured.length > 0 && (
          <div className="w-full px-6 md:p-9">
            <FeaturedProjects projects={featured} skipFirstImageReveals={skipFirstImageReveals} />
          </div>
        )}
        {rest.length > 0 && (
          <div className="w-full px-6 md:p-9">
            <ProjectList projects={rest} />
          </div>
        )}
      </section>
    </RevealContext.Provider>
  );
}
