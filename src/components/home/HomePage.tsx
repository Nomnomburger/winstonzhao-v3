'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HomePanel from './HomePanel';
import type { ProjectSummary } from '../../../sanity/lib/projects';

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-white dark:bg-[#1E1E1E] flex items-center justify-center z-50"
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

interface HomePageProps {
  projects: ProjectSummary[];
}

/** Home page shell: plays the loading bar, then hands off to the animated home content. */
export default function HomePage({ projects }: HomePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    // Small delay before starting content animations
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
      </AnimatePresence>
      <HomePanel showContent={showContent} projects={projects} />
    </>
  );
}
