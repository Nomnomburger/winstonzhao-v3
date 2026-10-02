'use client';

import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigationToggle } from '@/components/NavigationProvider';
import HomeNavigationBackdrop from '@/components/panels/HomeNavigationBackdrop';
import HomeMenuLinks, { MenuRevealText } from '@/components/panels/HomeMenuLinks';
import TextRevealMask from '@/components/panels/TextRevealMask';
import { expandedBioLines } from '@/components/panels/bio-copy';
import { FigmaRole, LanguageGlobe, NewlyRole, ScrambleText, useCurrentTime, useIsMobile, WZLogo } from '@/components/panels/shared';
import { translations, type Language } from '@/components/panels/translations';
import { useHomeMenu } from '@/components/panels/useHomeMenu';
import { useLanguage } from '@/components/panels/useLanguage';

export default function ProjectHeader({ projectCount }: { projectCount: number }) {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const currentTime = useCurrentTime(language);
  const { open, closing, setOpen, rootRef, triggerRef, navigationId, close, closeImmediately, cancelClose } = useHomeMenu();
  const expanded = open && !closing;
  const progress = useMotionValue(1);
  const menuProgress = useMotionValue(0);

  useEffect(() => {
    const animation = animate(menuProgress, expanded ? 1 : 0, {
      duration: reducedMotion ? 0 : 0.8,
      ease: [0.76, 0, 0.15, 1],
    });
    return () => animation.stop();
  }, [expanded, menuProgress, reducedMotion]);

  const toggleMenu = () => {
    if (closing) cancelClose();
    else if (open) close();
    else setOpen(true);
  };
  const cycleLanguage = () => {
    const languages: Language[] = ['en', 'sv', 'zh'];
    setLanguage(languages[(languages.indexOf(language) + 1) % languages.length]);
  };

  useNavigationToggle({
    enabled: true,
    progress,
    menuProgress,
    heroTop: 36,
    triggerRef,
    open,
    closing,
    navigationId,
    onClick: toggleMenu,
    onHomeNavigate: closeImmediately,
    instant: true,
    delay: 0,
  });

  return (
    <div
      ref={rootRef}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label={open ? 'Main navigation' : undefined}
      aria-owns={open ? 'site-navigation-name site-navigation-toggle' : undefined}
    >
      {/* Keep the original header's space above the project title. */}
      <div aria-hidden="true" className="h-[65px] md:h-[89px]" />
      {!open && <HomeNavigationBackdrop progress={progress} mobile={isMobile} />}

      <motion.div
        id={navigationId}
        aria-hidden={!open}
        inert={!open}
        data-home-menu-scroll
        data-lenis-prevent
        className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-background px-6 pb-12 pt-[104px] text-foreground md:flex md:flex-col md:px-9 md:pb-9 md:pt-36 lg:pt-[200px]"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-x-6">
          <HomeMenuLinks
            language={language}
            projectCount={String(projectCount)}
            projectsHref="/#work"
            open={expanded}
            onNavigate={closeImmediately}
            onProjects={closeImmediately}
            className="gap-12 md:gap-16"
          />
          <div
            className={`hidden md:block md:col-span-4 lg:col-span-2 leading-none ${language === 'zh' ? 'font-light tracking-[-0.02em]' : 'font-medium tracking-[-0.04em]'} [--menu-bio-size:40px] lg:[--menu-bio-size:52px] xl:[--menu-bio-size:64px]`}
            style={{ fontSize: 'clamp(24px, calc((100dvh - 312px) / 8), var(--menu-bio-size))' }}
          >
            {expandedBioLines[language].map((line, index) => (
              <div key={index}>
                <TextRevealMask active={expanded} delay={0.1 + index * 0.04} duration={0.9} instant={!!reducedMotion}>
                  <MenuRevealText open={expanded} reducedMotion={!!reducedMotion} distance="0.4em" enterDelay={0.1 + index * 0.04} exitDelay={index * 0.02} className="text-reveal-word inline-block">
                    <ScrambleText charDelay={0.02}>{line}</ScrambleText>
                  </MenuRevealText>
                </TextRevealMask>
              </div>
            ))}
          </div>
        </div>
        <motion.div
          aria-hidden={!expanded}
          inert={!expanded}
          className="hidden md:grid md:grid-cols-5 lg:grid-cols-3 gap-x-6 items-end mt-auto pt-12 text-[14px] tracking-[-0.02em] leading-[1.2]"
          initial={false}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}
        >
          <WZLogo className="w-[27px] h-[17px]" />
          <div className="md:col-span-3 lg:col-span-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
            <NewlyRole large label={t.designAt} />
            <FigmaRole large label={t.campusLeaderAt} />
          </div>
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <span>{currentTime}</span>
            <LanguageGlobe onClick={cycleLanguage} className="block w-3 h-3 shrink-0 cursor-pointer" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
