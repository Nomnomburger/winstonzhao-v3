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

interface BufferedPageProps {
  pageNumber: number;
  // Size the page occupies on screen right now (follows the gesture live)
  displayWidth: number;
  // Size pdf.js should render at (updates once zooming settles)
  settledWidth: number;
}

// pdf.js clears its canvas while re-rendering, which makes the page flash
// during zoom. Double-buffer instead: keep the current render on screen
// (CSS-scaled to the live display size) while the new size renders in a
// hidden slot, and swap slots only once the new render has completed.
function BufferedPage({ pageNumber, displayWidth, settledWidth }: BufferedPageProps) {
  const [aspect, setAspect] = useState<number | null>(null);
  const [visibleSlot, setVisibleSlot] = useState<'a' | 'b'>('a');
  const [visibleWidth, setVisibleWidth] = useState(settledWidth);

  // The hidden slot re-renders at the new size whenever one is pending
  const hiddenWidth = settledWidth !== visibleWidth ? settledWidth : null;

  const handleLoadSuccess = (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setAspect(viewport.height / viewport.width);
  };

  const renderSlot = (slot: 'a' | 'b') => {
    const isVisible = slot === visibleSlot;
    const width = isVisible ? visibleWidth : hiddenWidth;
    if (width === null) return null;
    const cssScale = displayWidth / width;
    const devicePixelRatio = Math.min(
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      2,
      MAX_CANVAS_WIDTH / width
    );
    return (
      <div
        key={slot}
        className={`absolute top-0 left-0 ${isVisible ? '' : 'opacity-0 pointer-events-none'}`}
        style={{
          width,
          transform:
            isVisible && Math.abs(cssScale - 1) > 1e-4
              ? `scale(${cssScale})`
              : undefined,
          transformOrigin: 'top left',
        }}
      >
        <Page
          key={`${slot}-${width}`}
          pageNumber={pageNumber}
          width={width}
          devicePixelRatio={devicePixelRatio}
          loading={null}
          onLoadSuccess={handleLoadSuccess}
          onRenderSuccess={() => {
            if (!isVisible) {
              setVisibleSlot(slot);
              setVisibleWidth(width);
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
        width: displayWidth,
        height: displayWidth * (aspect ?? LETTER_ASPECT),
      }}
    >
      {renderSlot('a')}
      {renderSlot('b')}
    </div>
  );
}

export default function ResumeViewer() {
  const router = useRouter();
  const [numPages, setNumPages] = useState(0);
  const [baseWidth, setBaseWidth] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  // The canvas re-renders at renderScale once the gesture pauses; until
  // then BufferedPage CSS-scales the previous render to follow the pinch
  const [renderScale, setRenderScale] = useState(1);
  const scaleRef = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Anchor captured when a zoom is requested, so the point under the
  // cursor/fingers can be kept in place once the new layout commits
  const pendingAnchor = useRef<{ x: number; y: number; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (scale === renderScale) return;
    const timer = setTimeout(() => setRenderScale(scale), 250);
    return () => clearTimeout(timer);
  }, [scale, renderScale]);

  const zoomTo = useCallback((nextScale: number, anchorX: number, anchorY: number) => {
    const clamped = clampScale(nextScale);
    if (clamped === scaleRef.current) return;
    scaleRef.current = clamped;
    if (contentRef.current) {
      pendingAnchor.current = {
        x: anchorX,
        y: anchorY,
        rect: contentRef.current.getBoundingClientRect(),
      };
    }
    setScale(clamped);
  }, []);

  // After the zoomed layout commits, scroll so the anchor point stays put
  useLayoutEffect(() => {
    const pending = pendingAnchor.current;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!pending || !container || !content) return;
    pendingAnchor.current = null;
    const { rect: prev, x, y } = pending;
    if (prev.width === 0 || prev.height === 0) return;
    const next = content.getBoundingClientRect();
    const relX = (x - prev.left) / prev.width;
    const relY = (y - prev.top) / prev.height;
    container.scrollLeft += next.left + relX * next.width - x;
    container.scrollTop += next.top + relY * next.height - y;
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
    let gestureStartScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureStartScale = scaleRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale?: number; clientX?: number; clientY?: number };
      if (!ge.scale) return;
      zoomTo(
        gestureStartScale * ge.scale,
        ge.clientX ?? window.innerWidth / 2,
        ge.clientY ?? window.innerHeight / 2
      );
    };
    const onGestureEnd = (e: Event) => e.preventDefault();
    window.addEventListener('gesturestart', onGestureStart);
    window.addEventListener('gesturechange', onGestureChange);
    window.addEventListener('gestureend', onGestureEnd);
    return () => {
      window.removeEventListener('gesturestart', onGestureStart);
      window.removeEventListener('gesturechange', onGestureChange);
      window.removeEventListener('gestureend', onGestureEnd);
    };
  }, [zoomTo]);

  // Trackpad pinch in Chrome/Firefox fires wheel events with ctrlKey set;
  // also covers ctrl/cmd + scroll on a mouse
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(
        scaleRef.current * Math.exp(-e.deltaY * 0.003),
        e.clientX,
        e.clientY
      );
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  // Pinch zoom on touch devices (Safari handles this via gesture* events):
  // zoom around the finger midpoint and pan as the midpoint moves
  useEffect(() => {
    const container = containerRef.current;
    if (!container || 'GestureEvent' in window) return;
    let previous: { distance: number; midX: number; midY: number } | null = null;
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
        previous = measure(e.touches);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !previous) return;
      e.preventDefault();
      const current = measure(e.touches);
      container.scrollLeft -= current.midX - previous.midX;
      container.scrollTop -= current.midY - previous.midY;
      zoomTo(
        scaleRef.current * (current.distance / previous.distance),
        current.midX,
        current.midY
      );
      previous = current;
    };
    const onTouchEnd = () => {
      previous = null;
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
  }, [zoomTo]);

  // Zoom with +/- keys, reset with 0, close with escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      if (e.key === '+' || e.key === '=') {
        zoomTo(scaleRef.current * 1.2, centerX, centerY);
      } else if (e.key === '-' || e.key === '_') {
        zoomTo(scaleRef.current / 1.2, centerX, centerY);
      } else if (e.key === '0') {
        zoomTo(1, centerX, centerY);
      } else if (e.key === 'Escape') {
        router.push('/');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomTo, router]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-auto bg-background"
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
                    displayWidth={baseWidth * scale}
                    settledWidth={baseWidth * renderScale}
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
