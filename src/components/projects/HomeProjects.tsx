'use client';

import { useEffect, useRef } from 'react';
import FeaturedProjects from './FeaturedProjects';
import ProjectList from './ProjectList';
import { RevealContext } from './reveal';
import type { ProjectCardData } from './types';

interface HomeProjectsProps {
  projects: ProjectCardData[];
  className?: string;
  // Scroll reveals wait for this (the end of the page's intro). When the
  // intro was skipped they're skipped too, and everything simply shows.
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
  className = '',
  revealReady = true,
  introSkipped = false,
  scrollToHashWhenReady = false,
  onScrollToWork,
}: HomeProjectsProps) {
  const ref = useRef<HTMLElement>(null);
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
    <RevealContext.Provider value={{ ready: revealReady, skip: introSkipped }}>
      <section
        ref={ref}
        id="work"
        aria-label="Work"
        tabIndex={-1}
        className={`relative flex flex-col gap-12 md:gap-9 w-full focus:outline-none ${className}`}
      >
        {featured.length > 0 && (
          <div className="w-full px-6 md:p-9">
            <FeaturedProjects projects={featured} />
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
