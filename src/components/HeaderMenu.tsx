'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useIsMobile } from '@/components/panels/shared';
import MobileHeaderMenu from '@/components/MobileHeaderMenu';

type HeaderMenuProps = {
  links: Array<{ id: string; label: ReactNode; href: string }>;
  collapsed?: boolean;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  mobileFooter?: ReactNode;
};

export default function HeaderMenu({
  links,
  collapsed = true,
  ariaLabel = 'Main navigation',
  className = '',
  panelClassName = '',
  mobileFooter,
}: HeaderMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const [previousCollapsed, setPreviousCollapsed] = useState(collapsed);
  const isMobile = useIsMobile();
  const [previousMobile, setPreviousMobile] = useState(isMobile);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  const reducedMotion = useReducedMotion();
  const open = collapsed && expanded;
  const mobileMenu = collapsed && isMobile;
  const close = useCallback(() => setExpanded(false), []);
  const transition = { duration: reducedMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] as const };

  // Reset the expanded menu when the header switches between its hero and
  // compact layouts, so returning to a compact header always starts closed.
  if (previousCollapsed !== collapsed || previousMobile !== isMobile) {
    setPreviousCollapsed(collapsed);
    setPreviousMobile(isMobile);
    setExpanded(false);
  }

  useEffect(() => {
    if (!open || mobileMenu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setExpanded(false);
      buttonRef.current?.focus();
    };
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setExpanded(false);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [open, mobileMenu]);

  return (
    <div
      ref={menuRef}
      className={`relative flex items-center ${className}`}
      onBlur={(event) => {
        if (mobileMenu) return;
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
      }}
    >
      {collapsed && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={open}
          aria-controls={navigationId}
          aria-haspopup={mobileMenu ? 'dialog' : undefined}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="relative block h-[17px] w-[18px] shrink-0 cursor-pointer md:h-6 md:w-6"
        >
          <motion.span
            aria-hidden="true"
            className="absolute left-0 top-[5px] h-px w-full bg-current md:top-[7px] md:h-[2px]"
            animate={open ? { y: isMobile ? 3 : 4, rotate: 45 } : { y: 0, rotate: 0 }}
            transition={transition}
          />
          <motion.span
            aria-hidden="true"
            className="absolute left-0 top-[11px] h-px w-full bg-current md:top-[15px] md:h-[2px]"
            animate={open ? { y: isMobile ? -3 : -4, rotate: -45 } : { y: 0, rotate: 0 }}
            transition={transition}
          />
        </button>
      )}

      {mobileMenu ? (
        <MobileHeaderMenu
          links={links}
          open={open}
          navigationId={navigationId}
          ariaLabel={ariaLabel}
          onClose={close}
          triggerRef={buttonRef}
          mobileFooter={mobileFooter}
        />
      ) : (
        <motion.nav
          id={navigationId}
          aria-label={ariaLabel}
          aria-hidden={collapsed && !open}
          inert={collapsed && !open}
          className={`flex items-center gap-4 whitespace-nowrap ${collapsed ? 'absolute right-full top-1/2 mr-4 -translate-y-1/2' : ''} ${panelClassName}`}
          initial={false}
          animate={collapsed && !open
            ? { opacity: 0, x: 8, clipPath: 'inset(0 0 0 100%)' }
            : { opacity: 1, x: 0, clipPath: 'inset(0 0 0 0%)' }}
          transition={transition}
          style={{ pointerEvents: collapsed && !open ? 'none' : 'auto' }}
        >
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              tabIndex={collapsed && !open ? -1 : undefined}
              onClick={() => setExpanded(false)}
              className="hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </motion.nav>
      )}
    </div>
  );
}
