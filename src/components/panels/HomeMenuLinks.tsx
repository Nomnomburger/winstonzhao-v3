'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { MouseEvent } from 'react';
import { LINKEDIN_URL, RESUME_URL } from '@/lib/site';
import { translations, type Language } from './translations';
import { ScrambleText } from './shared';
import TextRevealMask from './TextRevealMask';
import { TEXT_BLUR_EASE, TEXT_BLUR_REVEAL, TEXT_BLUR_TIMES } from './text-blur';

const MENU_BLUR_REVEAL = TEXT_BLUR_REVEAL.map((radius) => `blur(${radius * 0.8}px)`);

type HomeMenuLinksProps = {
  language: Language;
  projectCount: string;
  open: boolean;
  onNavigate: () => void;
  onProjects: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  showProjects?: boolean;
};

function MenuRevealText({ text, open, reducedMotion, distance, enterDelay, exitDelay, className }: {
  text: string;
  open: boolean;
  reducedMotion: boolean;
  distance: '0.4em' | '0.6em';
  enterDelay: number;
  exitDelay: number;
  className: string;
}) {
  const duration = reducedMotion ? 0 : open ? 0.9 : 0.32;
  const delay = reducedMotion ? 0 : open ? enterDelay : exitDelay;

  return (
    <motion.span
      className={className}
      initial={{ y: distance, opacity: 0, filter: 'blur(4px)' }}
      animate={open
        ? { y: [distance, '0em'], opacity: [0, 1], filter: MENU_BLUR_REVEAL }
        : { y: `-${distance}`, opacity: 0, filter: 'blur(5px)' }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
        ...(open ? { filter: { duration, delay, ease: TEXT_BLUR_EASE, times: [...TEXT_BLUR_TIMES] } } : {}),
      }}
    >
      {text}
    </motion.span>
  );
}

export default function HomeMenuLinks({ language, projectCount, open, onNavigate, onProjects, className = '', showProjects = true }: HomeMenuLinksProps) {
  const reducedMotion = useReducedMotion();
  const labelWeight = language === 'zh' ? 'font-light' : 'font-medium';
  const labels = {
    en: { contact: 'say hi', resume: 'resume' },
    sv: { contact: 'säg hej', resume: 'cv' },
    zh: { contact: '打个招呼', resume: '简历' },
  }[language];
  const links = [
    ...(showProjects ? [{ id: 'projects', label: translations[language].workLabel, detail: projectCount, href: '#work' }] : []),
    { id: 'contact', label: labels.contact, detail: 'LNKD', href: LINKEDIN_URL },
    { id: 'resume', label: labels.resume, detail: 'PDF', href: RESUME_URL },
  ];

  return (
    <nav aria-label="Main navigation" aria-hidden={!open} inert={!open} className={`flex flex-col items-start gap-10 md:gap-16 ${className}`}>
      {links.map((link, index) => (
        <Link
          key={link.id}
          href={link.href}
          data-home-menu-link
          onClick={link.id === 'projects' ? onProjects : onNavigate}
          target={link.id === 'contact' ? '_blank' : undefined}
          rel={link.id === 'contact' ? 'noopener noreferrer' : undefined}
          className={`flex items-start gap-2 whitespace-nowrap ${labelWeight} leading-none tracking-[-0.04em] text-[40px] md:text-[40px] lg:text-[52px] xl:text-[64px] transition-[font-weight] duration-700 ease-in-out`}
        >
          <ScrambleText
            charDelay={0.02}
            renderDisplay={(display) => {
              const words = display.split(' ');
              // Keep both contact word slots mounted when Chinese uses one,
              // so language changes preserve the menu's reveal animations.
              const wordCount = link.id === 'contact' ? 2 : 1;
              return (
                <span className={`flex ${words[1] ? 'gap-[0.18em]' : 'gap-0'}`}>
                  {Array.from({ length: wordCount }, (_, wordIndex) => (
                    <TextRevealMask key={wordIndex} active={open} delay={0.1 + index * 0.09 + wordIndex * 0.03} duration={0.9} instant={!!reducedMotion}>
                      <MenuRevealText
                        text={words[wordIndex] ?? ''}
                        open={open}
                        reducedMotion={!!reducedMotion}
                        distance="0.4em"
                        enterDelay={0.1 + index * 0.09 + wordIndex * 0.03}
                        exitDelay={index * 0.04 + wordIndex * 0.02}
                        className="text-reveal-word inline-block"
                      />
                    </TextRevealMask>
                  ))}
                </span>
              );
            }}
          >
            {link.label}
          </ScrambleText>
          <TextRevealMask active={open} delay={0.16 + index * 0.09} duration={0.9} instant={!!reducedMotion}
            className="text-[13px] lg:text-[16px] xl:text-[20px] leading-[1.5] tracking-[-0.02em]">
            <MenuRevealText
              text={link.detail}
              open={open}
              reducedMotion={!!reducedMotion}
              distance="0.6em"
              enterDelay={0.16 + index * 0.09}
              exitDelay={index * 0.04 + 0.03}
              className="text-reveal-word inline-block align-bottom"
            />
          </TextRevealMask>
        </Link>
      ))}
    </nav>
  );
}
