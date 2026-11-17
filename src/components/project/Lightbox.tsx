'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { imageAspect, imageUrl, type ImageLabel, type ImageSource } from '@/lib/image';
import ImageLabels from './ImageLabels';
import { getSmoothScroll } from '@/lib/smooth-scroll';

const LIGHTBOX_WIDTHS = [1000, 1600, 2400, 3200];
// The fade-out (globals.css, .lightbox[data-closing]) lasts 180ms and closes
// the dialog when it ends; this only covers a missed animationend.
const CLOSE_FALLBACK_MS = 300;
// Ignore clicks on the dialog right after it opens, so the second click of a
// double-click doesn't close it again.
const OPEN_GRACE_MS = 300;

// One scroll lock shared by every lightbox on the page. A count, rather than
// a snapshot per lightbox, so closing one while opening another can never
// restore a stale value and leave the page unscrollable. Lenis (desktop
// smooth scroll) moves the page on wheel input itself, so it is paused too.
// Where the page has a classic scrollbar, its gutter stays reserved so the
// page doesn't shift sideways; with overlay scrollbars (macOS, phones)
// reserving one would reflow the page.
let lockCount = 0;
let restoreScroll: (() => void) | null = null;

function acquireScrollLock() {
  lockCount += 1;
  if (lockCount === 1) {
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    const lenis = getSmoothScroll();
    const lenisWasStopped = lenis?.isStopped ?? true;
    if (window.innerWidth - root.clientWidth > 0) root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    lenis?.stop();
    restoreScroll = () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
      // SmoothScroll destroys Lenis below desktop width; don't revive it.
      if (lenis && !lenisWasStopped && getSmoothScroll() === lenis) lenis.start();
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      restoreScroll?.();
      restoreScroll = null;
    }
  };
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wraps an inline image in a button that opens it large in a modal dialog
// over a blurred page. Clicking anywhere, the close button or Escape closes
// it, and focus returns to the image.
export default function Lightbox({
  image,
  labels,
  children,
}: {
  image: ImageSource;
  labels?: ImageLabel[];
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const releaseLock = useRef<(() => void) | null>(null);
  const openedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // The inline image's size and loaded file, captured on open: the large
  // image never shows smaller than it already was on the page, and the
  // inline file stands in while the large one downloads.
  const [inlineWidth, setInlineWidth] = useState(0);
  const [placeholder, setPlaceholder] = useState<string>();

  // Every way of closing ends here: the fade ending, the fallback timer, a
  // native close (e.g. a second, non-cancelable Escape) and unmounting.
  const finish = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
    releaseLock.current?.();
    releaseLock.current = null;
    setOpen(false);
    setClosing(false);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      releaseLock.current?.();
    },
    [],
  );

  const dimensions = image.asset?.metadata?.dimensions;
  const widths = dimensions?.width
    ? [...LIGHTBOX_WIDTHS.filter((w) => w < dimensions.width), dimensions.width]
    : LIGHTBOX_WIDTHS;
  const src = imageUrl(image, widths[widths.length - 1]);
  // No file uploaded: nothing to open.
  if (!src) return <>{children}</>;
  const srcSet = widths.map((w) => `${imageUrl(image, w)} ${w}w`).join(', ');
  const aspect = imageAspect(image);

  const show = (event: MouseEvent<HTMLButtonElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
    setInlineWidth(event.currentTarget.getBoundingClientRect().width);
    setPlaceholder(event.currentTarget.querySelector('img')?.currentSrc || undefined);
    setLoaded(false);
    setClosing(false);
    setOpen(true);
    openedAt.current = performance.now();
    if (!releaseLock.current) releaseLock.current = acquireScrollLock();
    dialog.showModal();
    // From the keyboard (detail 0), focus the close button so focus stays
    // visible. From a click, focus the dialog itself: showModal would focus
    // the close button, and Safari then draws a ring on it after a click.
    if (event.detail === 0) closeButtonRef.current?.focus();
    else dialog.focus();
  };

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open || closeTimer.current !== undefined) return;
    if (reducedMotion()) {
      dialog.close();
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      dialog.close();
      finish();
    }, CLOSE_FALLBACK_MS);
  };

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
        aria-label="Image viewer"
        data-closing={closing ? '' : undefined}
        data-lenis-prevent
        onClick={(event) => {
          if (event.detail > 1 || performance.now() - openedAt.current < OPEN_GRACE_MS) return;
          close();
        }}
        onCancel={(event) => {
          // Escape: fade out like every other way of closing.
          event.preventDefault();
          close();
        }}
        onClose={() => {
          // A late close event from an earlier close must not undo a reopen.
          if (dialogRef.current?.open) return;
          finish();
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === 'lightbox-fade-out') {
            event.currentTarget.close();
            finish();
          }
        }}
        className="lightbox"
      >
        {open && (
          // The scroller holds the image, so a tall one scrolls under the
          // close button instead of taking the button with it.
          <div className="lightbox-scroll">
            {/* The box carries the size, the stand-in background and the
                animation; the image and any labels fill it. */}
            <div
              className="lightbox-image relative"
              style={{
                aspectRatio: aspect,
                // Fit the viewport, but never smaller than the image was
                // inline; a taller result scrolls.
                width: `max(min(100%, calc((100dvh - var(--lightbox-pad-y)) * ${aspect.toFixed(4)})), ${Math.round(inlineWidth)}px)`,
                maxWidth: dimensions?.width ? `min(100%, ${dimensions.width}px)` : '100%',
                backgroundImage: !loaded && placeholder ? `url("${placeholder}")` : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                srcSet={srcSet}
                sizes={aspect < 1 ? `calc((100vh - 132px) * ${aspect.toFixed(3)})` : '100vw'}
                alt={image.alt ?? ''}
                decoding="async"
                onLoad={() => setLoaded(true)}
                className="absolute inset-0 block h-full w-full"
              />
              <ImageLabels labels={labels} className="text-[12px] md:text-[16px]" />
            </div>
          </div>
        )}
        <button
          ref={closeButtonRef}
          type="button"
          // Its click bubbles to the dialog, which closes it.
          className="lightbox-close absolute bottom-6 md:bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 cursor-pointer font-normal text-[12px] tracking-[-0.24px] leading-normal focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground"
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
