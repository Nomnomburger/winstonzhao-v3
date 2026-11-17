'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { imageUrl, type ImageSource } from '@/lib/image';
import { getSmoothScroll } from '@/lib/smooth-scroll';

const LIGHTBOX_WIDTHS = [1000, 1600, 2400, 3200];
// Matches the fade-out in globals.css (.lightbox[data-closing]).
const CLOSE_MS = 180;

// Stop the page scrolling behind the lightbox. Lenis (desktop smooth scroll)
// moves the page on wheel input itself, so it is paused as well. Where the
// page has a classic scrollbar, its gutter stays reserved so the page doesn't
// shift sideways; with overlay scrollbars (macOS, phones) there is nothing to
// keep, and reserving a gutter would reflow the page.
function lockScroll() {
  const root = document.documentElement;
  const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
  const lenis = getSmoothScroll();
  const lenisWasStopped = lenis?.isStopped ?? true;
  if (window.innerWidth - root.clientWidth > 0) root.style.scrollbarGutter = 'stable';
  root.style.overflow = 'hidden';
  lenis?.stop();
  return () => {
    root.style.overflow = previous.overflow;
    root.style.scrollbarGutter = previous.gutter;
    if (lenis && !lenisWasStopped) lenis.start();
  };
}

// Wraps an inline image in a button that opens it large in a modal dialog
// over a blurred page. Clicking anywhere, the close button or Escape closes
// it, and focus returns to the image.
export default function Lightbox({ image, children }: { image: ImageSource; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
    dialog.showModal();
    // showModal focuses the close button, and Safari then draws a focus ring
    // on it even after a mouse click. Focus the dialog itself instead (no
    // ring); keyboard users can still Tab to the close button.
    dialog.focus();
  };

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => dialog.close(), CLOSE_MS);
  }, []);

  useEffect(() => (open ? lockScroll() : undefined), [open]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const fullWidth = image.asset?.metadata?.dimensions?.width;
  const widths = fullWidth
    ? [...LIGHTBOX_WIDTHS.filter((w) => w < fullWidth), fullWidth]
    : LIGHTBOX_WIDTHS;
  const src = imageUrl(image, widths[widths.length - 1]);
  const srcSet = widths.map((w) => `${imageUrl(image, w)} ${w}w`).join(', ');
  const { width, height } = image.asset?.metadata?.dimensions ?? {};

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-label={image.alt ? `View larger: ${image.alt}` : 'View larger image'}
        className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        tabIndex={-1}
        aria-label={image.alt || 'Image'}
        data-closing={closing ? '' : undefined}
        data-lenis-prevent
        onClick={close}
        onCancel={(event) => {
          // Escape: fade out like every other way of closing.
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setOpen(false);
          setClosing(false);
        }}
        className="lightbox"
      >
        {open && src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            srcSet={srcSet}
            sizes="100vw"
            width={width}
            height={height}
            alt={image.alt ?? ''}
            decoding="async"
            className="lightbox-image"
          />
        )}
        <button
          type="button"
          onClick={close}
          className="fixed bottom-6 md:bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 cursor-pointer font-normal text-[12px] tracking-[-0.24px] leading-normal focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
            <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="0.75" />
          </svg>
          close
        </button>
      </dialog>
    </>
  );
}
