'use client';

import { motion } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Language } from './translations';

// Placeholder targets — update with the real URLs
export const LINKEDIN_URL = 'https://www.linkedin.com/in/zhaowinston/?skipRedirect=true';
export const OLD_SITE_URL = 'https://winstonzhao.ca';
export const RESUME_URL = '/resume';
export const EMAIL = 'hello@winstonzhao.ca';

interface AnimatedWordProps {
  children: string;
  delay: number;
  movement?: string;
  instant?: boolean;
}

export function AnimatedWord({ children, delay, movement = '40%', instant = false }: AnimatedWordProps) {
  if (instant) {
    return (
      <span className="inline-block align-bottom">
        <span className="inline-block">{children}</span>
      </span>
    );
  }
  return (
    <motion.span
      className="inline-block align-bottom"
      initial={{ clipPath: 'inset(-10% -10% 0 -10%)' }}
      animate={{ clipPath: 'inset(-10% -10% -20% -10%)' }}
      transition={{
        duration: 0.5,
        delay: delay + 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.span
        className="inline-block"
        initial={{ y: movement, opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          duration: 0.9,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

interface AnimatedTextProps {
  children: string;
  baseDelay?: number;
  staggerDelay?: number;
  className?: string;
  movement?: string;
  instant?: boolean;
}

export function AnimatedText({ children, baseDelay = 0, staggerDelay = 0.08, className = '', movement = '40%', instant = false }: AnimatedTextProps) {
  const words = children.split(' ');

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={index}>
          <AnimatedWord delay={baseDelay + index * staggerDelay} movement={movement} instant={instant}>
            {word}
          </AnimatedWord>
          {index < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
}

const SCRAMBLE_LETTERS = 'abcdefghijklmnopqrstuvwxyzåäö';
const SCRAMBLE_DIGITS = '0123456789';
const SCRAMBLE_CJK = '设计形式功能产品师招呼现居开发参与网站项目简历英文访问德哥尔摩';

interface ScrambleTextProps {
  children: string;
  // Text shown before the first animation (the outgoing copy)
  from?: string;
  baseDelay?: number;
  charDelay?: number;
  // How long each character flickers through random letters before settling
  scrambleDuration?: number;
  className?: string;
}

// Typewriter-style scramble: the current text stays on screen and each
// character cycles through random letters before settling on the new copy.
// Used when the language changes so text is replaced in place.
export function ScrambleText({
  children,
  from,
  baseDelay = 0,
  charDelay = 0.02,
  scrambleDuration = 0.5,
  className = '',
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(from ?? children);
  const displayRef = useRef(from ?? children);

  useEffect(() => {
    if (displayRef.current === children) return;

    const fromChars = Array.from(displayRef.current);
    const toChars = Array.from(children);
    const length = Math.max(fromChars.length, toChars.length);
    // Current random letter per slot, held for a few frames so it reads as
    // flicker rather than pure noise.
    const scratch: string[] = [];
    const start = performance.now();
    let frame: number;

    const randomChar = (target: string) => {
      // Digits flicker through digits, CJK through CJK, letters through
      // letters; spaces and punctuation stay in place so word shapes
      // remain readable.
      if (/\d/.test(target)) {
        return SCRAMBLE_DIGITS[Math.floor(Math.random() * SCRAMBLE_DIGITS.length)];
      }
      if (/[㐀-鿿]/.test(target)) {
        return SCRAMBLE_CJK[Math.floor(Math.random() * SCRAMBLE_CJK.length)];
      }
      if (target && !/\p{L}/u.test(target)) return target;
      const char = SCRAMBLE_LETTERS[Math.floor(Math.random() * SCRAMBLE_LETTERS.length)];
      const isUpper = target !== target.toLowerCase() && target === target.toUpperCase();
      return isUpper ? char.toUpperCase() : char;
    };

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      let out = '';
      let settled = true;

      for (let i = 0; i < length; i++) {
        const to = toChars[i] ?? '';
        const fromChar = fromChars[i] ?? '';

        // Unchanged characters never scramble — e.g. only the digits move
        // when the clock changes format.
        if (fromChar === to) {
          out += to;
          continue;
        }

        const scrambleStart = baseDelay + i * charDelay;

        // Characters past the end of the new text never scramble — they
        // delete when the sweep reaches them, so the line shrinks toward
        // the shorter text instead of flickering at full length.
        if (to === '') {
          if (elapsed < scrambleStart) {
            settled = false;
            out += fromChar;
          }
          continue;
        }

        if (elapsed >= scrambleStart + scrambleDuration) {
          out += to;
        } else if (elapsed >= scrambleStart) {
          settled = false;
          if (!scratch[i] || Math.random() < 0.3) scratch[i] = randomChar(to);
          out += scratch[i];
        } else {
          settled = false;
          out += fromChar;
        }
      }

      displayRef.current = out;
      setDisplay(out);
      if (!settled) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [children, baseDelay, charDelay, scrambleDuration]);

  return <span className={className}>{display}</span>;
}

// English uses the 12-hour clock; Swedish and Chinese use 24-hour time
// with no AM/PM.
const TIME_LOCALES: Record<Language, string> = {
  en: 'en-US',
  sv: 'sv-SE',
  zh: 'zh-CN',
};

export function formatStockholmTime(language: Language, date = new Date()) {
  const formatter = new Intl.DateTimeFormat(TIME_LOCALES[language], {
    hour: language === 'en' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: language === 'en',
    timeZone: 'Europe/Stockholm',
  });
  return `STHLM ${formatter.format(date)}`;
}

export function useCurrentTime(language: Language = 'en') {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTime(formatStockholmTime(language));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  return time;
}

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

export function NewlyRole({ label = 'Design at' }: { label?: ReactNode }) {
  return (
    <div className="flex gap-[2px] items-center">
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">{label}</p>
      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center relative -top-[1px]">
        <svg viewBox="0 0 12 9.15607" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Newly" role="img" className="w-[12px] h-[9.156px] overflow-visible">
          <path d="M9.15638 1.89468C9.15638 2.41779 9.58039 2.84181 10.1035 2.84181H11.0509C11.574 2.84181 11.9981 3.26583 11.9981 3.78896V8.20937C11.9981 8.73249 11.574 9.15652 11.0509 9.15652H9.78796C9.26483 9.15652 8.84083 8.73249 8.84083 8.20937V4.10476C8.84083 3.58163 8.4168 3.15761 7.89368 3.15761H4.10438C3.58125 3.15761 3.15723 3.58163 3.15723 4.10476V8.20937C3.15723 8.73249 2.73321 9.15652 2.21008 9.15652H0.947145C0.42402 9.15652 0 8.73249 0 8.20937V3.7892C0 3.26608 0.42402 2.84205 0.947145 2.84205H1.89428C2.41741 2.84205 2.84143 2.41803 2.84143 1.8949V0.947766C2.84143 0.424641 3.26546 0.000620978 3.78858 0.000620978H8.20899C8.73212 0.000620978 9.15614 0.424641 9.15614 0.947766V1.89468H9.15638Z" fill="currentColor"/>
          <path d="M4.89574 5.08094C5.33176 5.08094 5.68498 5.66405 5.68498 6.38346C5.68498 6.39858 5.68474 6.4137 5.68451 6.42882C5.68115 6.58503 5.54604 6.69926 5.38982 6.69926H4.40141C4.24519 6.69926 4.11008 6.58479 4.10674 6.42882C4.10649 6.4137 4.10625 6.39882 4.10625 6.38346C4.10649 5.66429 4.45996 5.08094 4.89574 5.08094Z" fill="currentColor"/>
          <path d="M7.10355 5.08094C7.53955 5.08094 7.89279 5.66405 7.89279 6.38346C7.89279 6.39858 7.89255 6.4137 7.89231 6.42882C7.88894 6.58503 7.75385 6.69926 7.59763 6.69926H6.60921C6.453 6.69926 6.3179 6.58479 6.31453 6.42882C6.31429 6.4137 6.31406 6.39882 6.31406 6.38346C6.31429 5.66429 6.66753 5.08094 7.10355 5.08094Z" fill="currentColor"/>
        </svg>
      </div>
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap"><a href="https://newly.app" target="_blank" rel="noopener noreferrer" className="hover:underline">Newly</a></p>
    </div>
  );
}

export function FigmaRole({ label = 'Campus Leader at' }: { label?: ReactNode }) {
  return (
    <div className="flex gap-px items-center">
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">{label}</p>
      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center relative -top-[1px]">
        <svg viewBox="0 0 8 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Figma" role="img" className="w-[8px] h-[11px] overflow-visible">
          <path fillRule="evenodd" clipRule="evenodd" d="M0.979804 3.77733C0.389945 3.41078 0 2.77614 0 2.05464C0 0.919893 0.96456 0 2.15441 0H5.84559C7.03543 0 8 0.919893 8 2.05464C8 2.77614 7.61002 3.41078 7.02018 3.77733C7.61002 4.14388 8 4.77852 8 5.50002C8 6.63477 7.03543 7.55468 5.84559 7.55468H5.80632C5.24387 7.55468 4.73176 7.3491 4.34807 7.01244V8.92662C4.34807 10.074 3.36241 11 2.16417 11C0.976767 11 0 10.0824 0 8.94538C0 8.22391 0.38993 7.58927 0.979772 7.22266C0.38993 6.85612 0 6.22148 0 5.50002C0 4.77852 0.389945 4.14388 0.979804 3.77733ZM4.34807 5.50002C4.34807 6.26811 5.00096 6.89071 5.80632 6.89071H5.84559C6.65096 6.89071 7.30385 6.26811 7.30385 5.50002C7.30385 4.73195 6.65096 4.10931 5.84559 4.10931H5.80632C5.00096 4.10931 4.34807 4.73195 4.34807 5.50002ZM3.65191 4.10931H2.15441C1.34904 4.10931 0.696161 4.73195 0.696161 5.50002C0.696161 6.26652 1.34639 6.8882 2.1495 6.89071H2.15179H3.65191V4.10931ZM2.15441 7.55468C2.15277 7.55468 2.15114 7.55468 2.1495 7.55468C1.3464 7.55718 0.696161 8.17887 0.696161 8.94538C0.696161 9.71111 1.35635 10.3361 2.16417 10.3361C2.98283 10.3361 3.65191 9.70273 3.65191 8.92662V7.55468H2.15441ZM3.65191 3.44535H2.15441C1.34904 3.44535 0.696161 2.82271 0.696161 2.05464C0.696161 1.28657 1.34904 0.663923 2.15441 0.663923H3.65191V3.44535ZM5.84559 3.44535H4.34807V0.663923H5.84559C6.65096 0.663923 7.30385 1.28657 7.30385 2.05464C7.30385 2.82271 6.65096 3.44535 5.84559 3.44535Z" fill="currentColor"/>
        </svg>
      </div>
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap"><a href="https://figma.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Figma</a></p>
    </div>
  );
}

interface TextQLMarkProps {
  className?: string;
  ariaLabel?: string;
}

export function TextQLMark({ className = '', ariaLabel }: TextQLMarkProps) {
  return (
    <svg
      viewBox="98 141 305 218"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(ariaLabel ? { 'aria-label': ariaLabel, role: 'img' } : { 'aria-hidden': true })}
    >
      <path d="M136.998 141.347C157.539 140.877 180.058 141.16 200.686 141.292C204.975 148.107 213.145 158.368 218.152 165.05L249.186 206.462L314.547 293.745L343.742 332.685C350.13 341.187 357.02 350.067 363.127 358.697L299.318 358.747C297.953 356.017 293.937 351.122 291.99 348.497C287.857 342.887 283.685 337.31 279.473 331.762L252.503 295.822C249.98 292.485 246.843 288.185 244.355 284.695C244.186 284.662 244.017 284.627 243.849 284.595C238.172 289.412 231.973 295.305 226.39 300.365L198.862 325.177L175.602 346.12C170.981 350.257 166.076 354.485 161.624 358.772L98.1503 358.677C101.227 355.602 105.279 352.27 108.573 349.287C116.636 341.957 124.737 334.67 132.874 327.422L191.961 273.957L208.658 258.93C211.741 256.147 215.195 253.167 218.097 250.24C216.159 247.057 213.018 243.041 210.734 239.99L197.592 222.578L158.583 170.441L145.483 152.9C142.794 149.316 139.406 145.052 136.998 141.347Z" fill="currentColor"/>
      <path d="M398.927 158.202C399.012 158.342 399.1 158.482 399.185 158.623C392.512 196.114 378.977 271.345 372.935 304.98C371.28 313.715 369.715 322.468 368.24 331.235C367.48 335.555 366.248 341.385 365.883 345.618C361.693 339.13 355.632 331.313 350.862 325.1L338.715 308.795C336.362 305.623 332.647 300.345 330.025 297.585C330.225 294.043 331.203 289.348 331.853 285.718L335.19 267.043L342.625 225.874C343.065 223.461 345.627 206.893 346.622 205.898C351.32 201.191 357.8 195.591 362.835 191.068L398.927 158.202Z" fill="currentColor"/>
      <path d="M134.233 155.568C135.515 156.283 140.487 163.303 141.638 164.849L159.679 189.027C162.177 192.4 167.835 200.364 170.344 202.943C167.945 219.424 164.308 237.41 161.325 253.932L156.279 282.007C155.887 284.145 154.644 293.067 153.689 294.22C151.335 297.06 147.028 300.537 144.144 303.147L120.523 324.427C113.929 330.215 107.631 336.3 100.862 341.96C101.587 339.24 102.302 334.567 102.828 331.692L106.499 311.262L116.738 254.352L127.511 194.189C129.722 182.083 132.665 167.692 134.233 155.568Z" fill="currentColor"/>
      <path d="M339.3 141.357C345.492 141.146 352.135 141.258 358.355 141.257C373.085 141.315 387.815 141.296 402.543 141.199L309.345 225.583C302.703 231.481 296.24 237.473 289.535 243.365C288.28 241.535 286.8 239.522 285.44 237.775C278.173 228.432 271.377 218.174 263.802 209.132C268.3 204.675 274.372 199.668 279.175 195.321L313.372 164.485L329.465 149.932C331.805 147.793 336.88 142.925 339.3 141.357Z" fill="currentColor"/>
    </svg>
  );
}

export function TextQLRole({ label = 'Prev. Design at' }: { label?: ReactNode }) {
  return (
    <div className="flex gap-[2px] items-center">
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">{label}</p>
      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center relative -top-[1px]">
        <TextQLMark className="w-[12px] h-[8.578px] overflow-visible" ariaLabel="TextQL" />
      </div>
      <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap"><a href="https://textql.com" target="_blank" rel="noopener noreferrer" className="hover:underline">TextQL</a></p>
    </div>
  );
}

