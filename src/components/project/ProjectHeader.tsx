'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EMAIL, RESUME_URL } from '@/components/panels/shared';

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/#work' },
  { label: 'Contact', href: `mailto:${EMAIL}` },
  { label: 'Resume', href: RESUME_URL },
];

// Top bar of a project page: the name links home, and the two-line menu
// button opens a small list of links (the lines fold into an X).
export default function ProjectHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="relative z-30 flex items-start justify-between w-full p-6 md:p-9">
      <Link href="/" className="font-medium text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap">
        Winston Zhao
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="relative block w-[18px] h-[17px] cursor-pointer"
        >
          <motion.span
            className="absolute left-0 top-[5px] h-px w-full bg-foreground"
            animate={open ? { y: 3, rotate: 45 } : { y: 0, rotate: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.span
            className="absolute left-0 top-[11px] h-px w-full bg-foreground"
            animate={open ? { y: -3, rotate: -45 } : { y: 0, rotate: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.nav
              className="absolute right-0 top-9 flex flex-col items-end gap-2 font-normal text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {LINKS.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="hover:underline">
                  {link.label}
                </Link>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
