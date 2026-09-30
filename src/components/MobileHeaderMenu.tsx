'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type MobileHeaderMenuProps = {
  links: Array<{ id: string; label: ReactNode; href: string }>;
  open: boolean;
  navigationId: string;
  ariaLabel: string;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  mobileFooter?: ReactNode;
};

const EASE = [0.4, 0, 0.2, 1] as const;

function MobileMenuDialog({
  links,
  navigationId,
  ariaLabel,
  onClose,
  triggerRef,
  mobileFooter,
}: Omit<MobileHeaderMenuProps, 'open'>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const close = useCallback(() => {
    // Release before a link navigates, including same-page hash links.
    releaseRef.current?.();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const originalUrl = window.location.href;
    const body = document.body;
    const originalStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const backgroundElements = Array.from(body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== dialog)
      .map((element) => ({ element, inert: element.inert }));

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `${-scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    backgroundElements.forEach(({ element }) => { element.inert = true; });
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      document.removeEventListener('keydown', onKeyDown);
      backgroundElements.forEach(({ element, inert }) => { element.inert = inert; });
      Object.assign(body.style, originalStyles);
      if (window.location.href === originalUrl) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      }
      triggerRef.current?.focus({ preventScroll: true });
    };
    releaseRef.current = release;
    return () => {
      release();
      releaseRef.current = null;
    };
  }, [close, triggerRef]);

  const exitDelay = reducedMotion ? 0 : Math.max(0, links.length - 1) * 0.06 + 0.25;

  return (
    <motion.div
      ref={dialogRef}
      id={navigationId}
      role="dialog"
      aria-modal={isPresent ? true : undefined}
      aria-label={ariaLabel}
      aria-hidden={!isPresent}
      inert={!isPresent}
      data-lenis-prevent
      className="theme-root fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-background text-foreground"
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
      initial={{ opacity: reducedMotion ? 1 : 0 }}
      animate={{ opacity: 1, transition: { duration: reducedMotion ? 0 : 0.2, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.2, delay: exitDelay, ease: EASE } }}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Close menu"
        onClick={close}
        className="absolute right-6 top-6 block h-[17px] w-[18px] cursor-pointer"
      >
        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-[5px] h-px w-full bg-current"
          initial={reducedMotion ? false : { y: 0, rotate: 0 }}
          animate={{ y: 3, rotate: 45 }}
          exit={{ y: 0, rotate: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: EASE }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-[11px] h-px w-full bg-current"
          initial={reducedMotion ? false : { y: 0, rotate: 0 }}
          animate={{ y: -3, rotate: -45 }}
          exit={{ y: 0, rotate: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: EASE }}
        />
      </button>

      <div className="flex min-h-dvh flex-col px-6 pb-12 pt-24">
        <motion.nav
          aria-label={ariaLabel}
          className="flex flex-1 flex-col items-start justify-start gap-3 font-medium text-[32px] leading-[1.1] tracking-[-0.02em]"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {links.map((link, index) => {
            const words = typeof link.label === 'string' ? link.label.split(' ') : [link.label];
            const exitWordDelay = reducedMotion ? 0 : (links.length - 1 - index) * 0.06;
            return (
              <Link key={link.id} href={link.href} onClick={close} className="hover:underline">
                {words.map((word, wordIndex) => {
                  const delay = reducedMotion ? 0 : index * 0.1 + wordIndex * 0.08;
                  return (
                    <span key={wordIndex}>
                      <motion.span
                        className="inline-block align-bottom"
                        variants={{
                          hidden: { clipPath: 'inset(-10% -10% 0 -10%)' },
                          visible: {
                            clipPath: 'inset(-10% -10% -20% -10%)',
                            transition: { duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : delay + 0.5, ease: EASE },
                          },
                          exit: {
                            clipPath: 'inset(-10% -10% 0 -10%)',
                            transition: { duration: reducedMotion ? 0 : 0.25, delay: exitWordDelay, ease: EASE },
                          },
                        }}
                      >
                        <motion.span
                          className="inline-block"
                          variants={{
                            hidden: { y: reducedMotion ? '0%' : '40%', opacity: reducedMotion ? 1 : 0 },
                            visible: { y: '0%', opacity: 1, transition: { duration: reducedMotion ? 0 : 0.9, delay, ease: EASE } },
                            exit: { y: reducedMotion ? '0%' : '40%', opacity: 0, transition: { duration: reducedMotion ? 0 : 0.35, delay: exitWordDelay, ease: EASE } },
                          }}
                        >
                          {word}
                        </motion.span>
                      </motion.span>
                      {wordIndex < words.length - 1 && ' '}
                    </span>
                  );
                })}
              </Link>
            );
          })}
        </motion.nav>
        {mobileFooter != null && (
          <motion.div
            className="mt-12 shrink-0"
            initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: EASE }}
          >
            {mobileFooter}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function MobileHeaderMenu({ open, ...props }: MobileHeaderMenuProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && <MobileMenuDialog {...props} />}
    </AnimatePresence>,
    document.body,
  );
}
