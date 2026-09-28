'use client';

import FeaturedProjects from './FeaturedProjects';
import ProjectList from './ProjectList';
import type { ProjectCardData } from './types';

interface HomeProjectsProps {
  projects: ProjectCardData[];
  learnMoreLabel: string;
  className?: string;
}

// The home page's work section: projects marked "featured" in Sanity show as
// photo cards, and everything else goes in the list below them.
export default function HomeProjects({ projects, learnMoreLabel, className = '' }: HomeProjectsProps) {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);
  if (projects.length === 0) return null;

  return (
    <section id="work" aria-label="Work" className={`flex flex-col gap-12 md:gap-9 w-full ${className}`}>
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
