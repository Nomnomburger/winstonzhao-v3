'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { EMAIL, RESUME_URL } from '@/lib/site';

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
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // The menu closes on Escape (focus goes back to the button), on a click or
  // tap anywhere else, and when keyboard focus moves out of it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <header className="relative z-30 flex items-start justify-between w-full p-6 md:p-9">
      <Link href="/" className="font-medium text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap">
        Winston Zhao
      </Link>

      <div
        ref={menuRef}
        className="relative"
        onBlur={(e) => {
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <button
          ref={buttonRef}
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
              className="absolute -right-3 top-6 flex flex-col items-end gap-2 p-3 bg-background font-normal text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap"
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
