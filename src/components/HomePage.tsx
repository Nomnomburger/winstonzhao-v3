'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import HomePanel from '@/components/panels/HomePanel';
import HomePanelMobile from '@/components/panels/HomePanelMobile';
import { useIsMobile } from '@/components/panels/shared';
import type { Language } from '@/components/panels/translations';
import type { ProjectCardData } from '@/components/projects/types';

// Survives client-side navigation (e.g. visiting /resume and closing it)
// so the intro only plays on a fresh page load
let hasPlayedIntro = false;

// The selected language also survives navigation away and back; the
// sessionStorage copy additionally survives full reloads within the tab.
// Implemented as a tiny external store so the page can subscribe via
// useSyncExternalStore (hydration-safe: the server snapshot is always 'en'
// and React re-renders with the restored language after hydration).
const LANGUAGE_STORAGE_KEY = 'language';

const isLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'sv' || value === 'zh';

let savedLanguage: Language = 'en';
let restoredFromSession = false;
const languageListeners = new Set<() => void>();

const subscribeToLanguage = (listener: () => void) => {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
};

const getLanguage = (): Language => {
  if (!restoredFromSession) {
    restoredFromSession = true;
    try {
      const stored = sessionStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(stored)) savedLanguage = stored;
    } catch {
      // sessionStorage unavailable (e.g. blocked) — keep the default
    }
  }
  return savedLanguage;
};

const getServerLanguage = (): Language => 'en';

const setLanguage = (lang: Language) => {
  savedLanguage = lang;
  try {
    sessionStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // sessionStorage unavailable — the module variable still covers
    // client-side navigation
  }
  languageListeners.forEach((listener) => listener());
};

export default function HomePage({ projects }: { projects: ProjectCardData[] }) {
  const [skipIntro] = useState(hasPlayedIntro);
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage, getServerLanguage);
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
