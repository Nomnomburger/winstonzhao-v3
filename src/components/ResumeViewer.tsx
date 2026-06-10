'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Served from public/, kept in sync with pdfjs-dist by scripts/copy-pdf-worker.mjs
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Single source of truth for the resume file — replace public/winstonzhao-resume.pdf to update
const RESUME_PDF = '/winstonzhao-resume.pdf';

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const LETTER_ASPECT = 11 / 8.5;
// Keep canvases under ~4k px wide so deep zoom doesn't allocate huge
// textures, which makes panning stutter (especially on mobile)
const MAX_CANVAS_WIDTH = 4096;

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

// Stacked backdrop-filter layers, each masked to a band, so the blur ramps
// up smoothly from nothing down to the bottom edge of the page. Backdrop
// filters re-blur on every scrolled frame, so keep the stack small.
const BLUR_LAYERS = [
  { blur: 1, stops: [0, 16.7, 33.3, 50] },
  { blur: 2.5, stops: [16.7, 33.3, 50, 66.7] },
  { blur: 6, stops: [33.3, 50, 66.7, 83.3] },
  { blur: 14, stops: [50, 66.7, 83.3, 100] },
];

function ProgressiveBlur() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-24"
    >
      {BLUR_LAYERS.map(({ blur, stops: [a, b, c, d] }) => {
        const mask = `linear-gradient(to bottom, transparent ${a}%, black ${b}%, black ${c}%, ${d >= 100 ? 'black 100%' : `transparent ${d}%`})`;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}

// pdf.js clears its canvas while re-rendering, which makes the page flash
// when the zoom level commits. Double-buffer instead: keep the current
// render on screen (CSS-scaled to the new size) while the new size renders
// in a hidden slot, and swap slots only once the new render has completed.
function BufferedPage({ pageNumber, width }: { pageNumber: number; width: number }) {
  const [aspect, setAspect] = useState<number | null>(null);
  const [visibleSlot, setVisibleSlot] = useState<'a' | 'b'>('a');
  const [visibleWidth, setVisibleWidth] = useState(width);

  // The hidden slot re-renders at the new size whenever one is pending
  const hiddenWidth = width !== visibleWidth ? width : null;

  const handleLoadSuccess = (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setAspect(viewport.height / viewport.width);
  };

  const renderSlot = (slot: 'a' | 'b') => {
    const isVisible = slot === visibleSlot;
    const slotWidth = isVisible ? visibleWidth : hiddenWidth;
    if (slotWidth === null) return null;
    const cssScale = width / slotWidth;
    const devicePixelRatio = Math.min(
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      2,
      MAX_CANVAS_WIDTH / slotWidth
    );
    return (
      <div
        key={slot}
        className={`absolute top-0 left-0 ${isVisible ? '' : 'opacity-0 pointer-events-none'}`}
        style={{
          width: slotWidth,
          transform:
            isVisible && Math.abs(cssScale - 1) > 1e-4
              ? `scale(${cssScale})`
              : undefined,
          transformOrigin: 'top left',
        }}
      >
        <Page
          key={`${slot}-${slotWidth}`}
          pageNumber={pageNumber}
          width={slotWidth}
          devicePixelRatio={devicePixelRatio}
          loading={null}
          onLoadSuccess={handleLoadSuccess}
          onRenderSuccess={() => {
            if (!isVisible) {
              setVisibleSlot(slot);
              setVisibleWidth(slotWidth);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden border-[0.5px] border-black"
      style={{
        width,
        height: width * (aspect ?? LETTER_ASPECT),
      }}
    >
      {renderSlot('a')}
      {renderSlot('b')}
    </div>
  );
}

interface GestureState {
  // Visual scale factor relative to the committed scale
  factor: number;
  // Pan that follows the finger midpoint
  dx: number;
  dy: number;
  // Gesture anchor in viewport coordinates
  anchorX: number;
  anchorY: number;
}

export default function ResumeViewer() {
  const router = useRouter();
  const [numPages, setNumPages] = useState(0);
  const [baseWidth, setBaseWidth] = useState<number | null>(null);
  // Committed zoom level: only updates when a gesture ends, so React never
  // re-renders mid-pinch. While a gesture is active the content is scaled
  // with a plain CSS transform — pure compositor work, like native pinch.
  // On phones the fit width is too small to read, so open already zoomed
  // to a readable width, anchored at the page's top-left corner.
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return 1;
    const fitWidth = Math.max(260, Math.min(860, window.innerWidth - 72));
    return clampScale(680 / fitWidth);
  });
  const committedScale = useRef(scale);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<GestureState | null>(null);
  // Where the content appeared when the gesture ended, so scroll can be
  // corrected after the re-render commits
  const pendingVisual = useRef<DOMRect | null>(null);

  const startGesture = useCallback((anchorX: number, anchorY: number) => {
    const content = contentRef.current;
    if (!content || gesture.current) return;
    const rect = content.getBoundingClientRect();
    gesture.current = { factor: 1, dx: 0, dy: 0, anchorX, anchorY };
    content.style.transformOrigin = `${anchorX - rect.left}px ${anchorY - rect.top}px`;
    content.style.willChange = 'transform';
    // Hide the pdf.js text/annotation layers (see globals.css) so the
    // browser only scales the canvas texture while the gesture runs
    containerRef.current?.classList.add('pdf-gesturing');
  }, []);

  const updateGesture = useCallback(
    (factor: number, midX?: number, midY?: number) => {
      const content = contentRef.current;
      const g = gesture.current;
      if (!content || !g) return;
      // Clamp visually so the gesture can't exceed the zoom limits
      g.factor = clampScale(committedScale.current * factor) / committedScale.current;
      if (midX !== undefined && midY !== undefined) {
        g.dx = midX - g.anchorX;
        g.dy = midY - g.anchorY;
      }
      content.style.transform = `translate(${g.dx}px, ${g.dy}px) scale(${g.factor})`;
    },
    []
  );

  const endGesture = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    const g = gesture.current;
    if (!content || !container || !g) return;
    gesture.current = null;
    const next = clampScale(committedScale.current * g.factor);
    if (next === committedScale.current) {
      // Pure pan (or no-op): fold the translation into the scroll position
      content.style.transform = '';
      content.style.transformOrigin = '';
      content.style.willChange = '';
      container.classList.remove('pdf-gesturing');
      container.scrollLeft -= g.dx;
      container.scrollTop -= g.dy;
      return;
    }
    // Remember where the content visually sits (transform included), then
    // commit the new scale; the layout effect below restores the position
    pendingVisual.current = content.getBoundingClientRect();
    committedScale.current = next;
    setScale(next);
  }, []);

  // After the zoomed layout commits, clear the gesture transform and scroll
  // so the content stays exactly where the gesture left it visually
  useLayoutEffect(() => {
    const visual = pendingVisual.current;
    const content = contentRef.current;
    const container = containerRef.current;
    if (!visual || !content || !container) return;
    pendingVisual.current = null;
    content.style.transform = '';
    content.style.transformOrigin = '';
    content.style.willChange = '';
    container.classList.remove('pdf-gesturing');
    const rect = content.getBoundingClientRect();
    container.scrollLeft += rect.left - visual.left;
    container.scrollTop += rect.top - visual.top;
  }, [scale]);

  // Start at a comfortable reading width, top-aligned so the rest scrolls
  useEffect(() => {
    const compute = () => {
      setBaseWidth(Math.max(260, Math.min(860, window.innerWidth - 72)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Trackpad pinch in Safari fires gesture* events instead of ctrl+wheel
  useEffect(() => {
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { clientX?: number; clientY?: number };
      startGesture(
        ge.clientX ?? window.innerWidth / 2,
        ge.clientY ?? window.innerHeight / 2
      );
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale?: number };
      if (ge.scale) updateGesture(ge.scale);
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      endGesture();
    };
    window.addEventListener('gesturestart', onGestureStart);
    window.addEventListener('gesturechange', onGestureChange);
    window.addEventListener('gestureend', onGestureEnd);
    return () => {
      window.removeEventListener('gesturestart', onGestureStart);
      window.removeEventListener('gesturechange', onGestureChange);
      window.removeEventListener('gestureend', onGestureEnd);
    };
  }, [startGesture, updateGesture, endGesture]);

  // Trackpad pinch in Chrome/Firefox fires wheel events with ctrlKey set
  // (also ctrl/cmd + scroll on a mouse). Wheel has no end event, so the
  // gesture commits shortly after the last tick.
  useEffect(() => {
    let wheelFactor = 1;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (!gesture.current) {
        wheelFactor = 1;
        startGesture(e.clientX, e.clientY);
      }
      wheelFactor *= Math.exp(-e.deltaY * 0.003);
      updateGesture(wheelFactor);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(endGesture, 180);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [startGesture, updateGesture, endGesture]);

  // Pinch zoom on touch devices (Safari handles this via gesture* events):
  // zoom around the finger midpoint and pan as the midpoint moves
  useEffect(() => {
    const container = containerRef.current;
    if (!container || 'GestureEvent' in window) return;
    let startDistance: number | null = null;
    const measure = (touches: TouchList) => ({
      distance: Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      ),
      midX: (touches[0].clientX + touches[1].clientX) / 2,
      midY: (touches[0].clientY + touches[1].clientY) / 2,
    });
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const m = measure(e.touches);
        startDistance = m.distance;
        startGesture(m.midX, m.midY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDistance === null) return;
      e.preventDefault();
      const m = measure(e.touches);
      updateGesture(m.distance / startDistance, m.midX, m.midY);
    };
    const onTouchEnd = () => {
      if (startDistance === null) return;
      startDistance = null;
      endGesture();
    };
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [startGesture, updateGesture, endGesture]);

  // Zoom with +/- keys, reset with 0, close with escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const step = (factor: number) => {
        startGesture(centerX, centerY);
        updateGesture(factor);
        endGesture();
      };
      if (e.key === '+' || e.key === '=') {
        step(1.2);
      } else if (e.key === '-' || e.key === '_') {
        step(1 / 1.2);
      } else if (e.key === '0') {
        step(1 / committedScale.current);
      } else if (e.key === 'Escape') {
        router.push('/');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startGesture, updateGesture, endGesture, router]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-auto bg-background no-scrollbar"
      style={{ touchAction: 'pan-x pan-y' }}
    >
      <div className="flex h-fit w-fit min-h-full min-w-full">
        <div className="mx-auto px-9 pt-9 pb-40">
          {baseWidth !== null && (
            <div ref={contentRef}>
              <Document
                file={RESUME_PDF}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={null}
                error={
                  <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal text-[#1E1E1E] dark:text-white">
                    failed to load resume
                  </p>
                }
                className="flex flex-col gap-6"
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <BufferedPage
                    key={index}
                    pageNumber={index + 1}
                    width={baseWidth * scale}
                  />
                ))}
              </Document>
            </div>
          )}
        </div>
      </div>

      <ProgressiveBlur />

      {/* Actions - fixed so they stay put while the pdf zooms underneath;
          white + difference blending flips them dark over the light pdf
          and light over the dark page background */}
      <div className="fixed bottom-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 font-normal text-[12px] tracking-[-0.24px] leading-normal text-white mix-blend-difference whitespace-nowrap">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 9 9"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1L8 8M8 1L1 8"
              stroke="currentColor"
              strokeWidth="0.75"
            />
          </svg>
          close
        </button>
        <a
          href={RESUME_PDF}
          download="winstonzhao-resume.pdf"
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 9 9"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4.5 0.5V6M4.5 6L2 3.5M4.5 6L7 3.5"
              stroke="currentColor"
              strokeWidth="0.75"
            />
            <path d="M0.5 8.5H8.5" stroke="currentColor" strokeWidth="0.75" />
          </svg>
          download
        </a>
      </div>
    </div>
  );
}
