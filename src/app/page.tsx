'use client';

import { useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HomePanel from '@/components/panels/HomePanel';
import HomePanelMobile from '@/components/panels/HomePanelMobile';
import { useIsMobile } from '@/components/panels/shared';
import type { Language } from '@/components/panels/translations';

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full h-[2px] relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-foreground"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={onComplete}
        />
      </div>
    </motion.div>
  );
}

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

export default function Home() {
  const [skipIntro] = useState(hasPlayedIntro);
  const [isLoading, setIsLoading] = useState(!hasPlayedIntro);
  const [showContent, setShowContent] = useState(hasPlayedIntro);
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage, getServerLanguage);
  const isMobile = useIsMobile();

  const handleLoadingComplete = () => {
    hasPlayedIntro = true;
    setIsLoading(false);
    // Small delay before starting content animations
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <div className="relative w-screen h-dvh">
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
      </AnimatePresence>

      {isMobile ? (
        <HomePanelMobile
          showContent={showContent}
          instant={skipIntro}
          language={language}
          onLanguageChange={setLanguage}
        />
      ) : (
        <HomePanel
          showContent={showContent}
          instant={skipIntro}
          language={language}
          onLanguageChange={setLanguage}
        />
      )}
    </div>
  );
}
