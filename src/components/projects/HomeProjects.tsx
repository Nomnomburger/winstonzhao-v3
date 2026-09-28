'use client';

import { useEffect, useRef } from 'react';
import FeaturedProjects from './FeaturedProjects';
import ProjectList from './ProjectList';
import type { ProjectCardData } from './types';

interface HomeProjectsProps {
  projects: ProjectCardData[];
  learnMoreLabel: string;
  className?: string;
  // False while the layout above is still animating in. Arriving at /#work
  // (the "Work" link on project pages) scrolls here once it's true.
  ready?: boolean;
}

// The home page's work section: projects marked "featured" in Sanity show as
// photo cards, and everything else goes in the list below them.
export default function HomeProjects({ projects, learnMoreLabel, className = '', ready = true }: HomeProjectsProps) {
  const ref = useRef<HTMLElement>(null);
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  // The section only exists once the intro has played, so the browser's own
  // jump to #work finds nothing on a fresh load. Scroll once the layout has
  // settled; waiting two frames lets late size updates (e.g. the header's
  // shrunk font size) land first.
  useEffect(() => {
    if (!ready || window.location.hash !== '#work') return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => ref.current?.scrollIntoView());
    });
    return () => cancelAnimationFrame(frame);
  }, [ready]);

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
