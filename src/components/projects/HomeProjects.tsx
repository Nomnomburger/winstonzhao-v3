'use client';

import { useEffect, useRef } from 'react';
import FeaturedProjects from './FeaturedProjects';
import ProjectList from './ProjectList';
import type { ProjectCardData } from './types';

interface HomeProjectsProps {
  projects: ProjectCardData[];
  learnMoreLabel: string;
  className?: string;
  // Arriving at /#work (the "Work" link on project pages): when the intro was
  // skipped the browser's own jump to the hash already landed here; otherwise
  // this scrolls here once `scrollToHashWhenReady` is set (after the intro).
  introSkipped?: boolean;
  scrollToHashWhenReady?: boolean;
}

// The home page's work section: projects marked "featured" in Sanity show as
// photo cards, and everything else goes in the list below them.
export default function HomeProjects({
  projects,
  learnMoreLabel,
  className = '',
  introSkipped = false,
  scrollToHashWhenReady = false,
}: HomeProjectsProps) {
  const ref = useRef<HTMLElement>(null);
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  // The section only exists once the intro has played, so the browser's own
  // jump to #work finds nothing on a fresh load. Scroll once the intro is done
  // (two frames later, so late size updates land first), unless the visitor
  // has already scrolled. The hash is then dropped from the URL, so going Back
  // to this page later restores its scroll position instead of jumping here.
  useEffect(() => {
    if (window.location.hash !== '#work') return;
    const dropHash = () =>
      history.replaceState(history.state, '', window.location.pathname + window.location.search);
    if (introSkipped) {
      dropHash();
      return;
    }
    if (!scrollToHashWhenReady) return;
    if (window.scrollY > 0) {
      dropHash();
      return;
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        ref.current?.scrollIntoView();
        dropHash();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [introSkipped, scrollToHashWhenReady]);

  if (projects.length === 0) return null;

  return (
    <section
      ref={ref}
      id="work"
      aria-label="Work"
      tabIndex={-1}
      className={`flex flex-col gap-12 md:gap-9 w-full focus:outline-none ${className}`}
    >
      {featured.length > 0 && (
        <div className="w-full px-6 md:p-9">
          <FeaturedProjects projects={featured} />
        </div>
      )}
      {rest.length > 0 && (
        <div className="w-full px-6 md:p-9">
          <ProjectList projects={rest} learnMoreLabel={learnMoreLabel} />
        </div>
      )}
    </section>
  );
}
