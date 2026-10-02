'use client';

import { useEffect, useState } from 'react';
import HomePanel from '@/components/panels/HomePanel';
import HomePanelMobile from '@/components/panels/HomePanelMobile';
import { useIsMobile } from '@/components/panels/shared';
import { useLanguage } from '@/components/panels/useLanguage';
import { useHasNavigationSource } from '@/components/NavigationProvider';
import type { ProjectCardData } from '@/components/projects/types';

// Survives client-side navigation (e.g. visiting /resume and closing it)
// so the intro only plays on a fresh page load
let hasPlayedIntro = false;

export default function HomePage({ projects }: { projects: ProjectCardData[] }) {
  const hasNavigationSource = useHasNavigationSource();
  const [skipIntro] = useState(hasPlayedIntro || hasNavigationSource);
  const { language, setLanguage } = useLanguage();
  const isMobile = useIsMobile();

  useEffect(() => {
    hasPlayedIntro = true;
  }, []);

  return (
    <div
      className="relative w-full min-h-dvh"
      style={projects.length > 0 ? { touchAction: 'var(--hero-touch-action, pan-x pinch-zoom)' } : undefined}
    >
      {isMobile ? (
        <HomePanelMobile
          instant={skipIntro}
          language={language}
          onLanguageChange={setLanguage}
          projects={projects}
        />
      ) : (
        <HomePanel
          instant={skipIntro}
          language={language}
          onLanguageChange={setLanguage}
          projects={projects}
        />
      )}
    </div>
  );
}
