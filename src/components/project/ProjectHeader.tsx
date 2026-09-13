'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE } from '@/lib/site';

const springTransition = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 55,
  mass: 0.6,
};

/**
 * Compact header used on project pages: the site name on the left and a
 * two-line menu icon on the right that reveals the Work / Contact / Resume
 * links when toggled.
 */
export default function ProjectHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-start justify-between p-9 w-full">
      <Link
        href="/"
        className="text-[14px] font-medium leading-[normal] tracking-[-0.28px] whitespace-nowrap hover:opacity-70 transition-opacity"
      >
        {SITE.name}
      </Link>

      <div className="flex gap-4 h-[17px] items-center justify-center text-[14px] leading-[normal] tracking-[-0.28px] whitespace-nowrap">
        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              key="links"
              className="flex gap-4 items-center"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              aria-label="Site navigation"
            >
              <Link href="/projects" className="hover:opacity-70 transition-opacity">
                Work
              </Link>
              <Link href="/contact" className="hover:opacity-70 transition-opacity">
                Contact
              </Link>
              <a
                href={SITE.resume}
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                Resume
              </a>
            </motion.nav>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex h-full w-[18px] shrink-0 items-center justify-center bg-transparent border-none p-0 cursor-pointer"
        >
          <svg
            width="18"
            height="17"
            viewBox="0 0 18 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Two 18px lines (6px apart) that fold into an X when the menu is open */}
            <motion.path
              d="M0 5.5L18 5.5"
              stroke="currentColor"
              animate={{ d: open ? 'M3 2.5L15 14.5' : 'M0 5.5L18 5.5' }}
              transition={springTransition}
            />
            <motion.path
              d="M0 11.5L18 11.5"
              stroke="currentColor"
              animate={{ d: open ? 'M15 2.5L3 14.5' : 'M0 11.5L18 11.5' }}
              transition={springTransition}
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
