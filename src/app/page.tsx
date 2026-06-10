'use client';

import { useState } from 'react';
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
          className="absolute top-0 left-0 h-full bg-[#1E1E1E] dark:bg-white"
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

export default function Home() {
  const [skipIntro] = useState(hasPlayedIntro);
  const [isLoading, setIsLoading] = useState(!hasPlayedIntro);
  const [showContent, setShowContent] = useState(hasPlayedIntro);
  const [language, setLanguage] = useState<Language>('en');
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
