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
const MAX_SCALE = 3;
const LETTER_ASPECT = 11 / 8.5;
// Base texture bound: rendered once, never re-rendered
const MAX_CANVAS_WIDTH = 4096;
// Sharpening overlay bound (device px); rendered only when zoom is idle
const MAX_REFINE_WIDTH = 5500;
// Must match the content wrapper's pt-9 / pb-40 paddings below
const PAD_TOP = 36;
const PAD_BOTTOM = 160;

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

// Each page renders once at a fixed high resolution and zooming only
// CSS-scales that texture, so gestures always run on the compositor and
// can never be starved by pdf.js raster work. When a deep zoom sits idle,
// a sharpening overlay adds a pixel-exact render on top. The overlay is
// double-buffered: the previous sharp render stays visible (CSS-scaled)
// while the next one renders in a hidden slot, so the page never falls
// back to the soft base texture between zoom levels.
function FixedResPage({
  pageNumber,
  renderWidth,
  displayWidth,
  refineWidth,
  onRefineDone,
}: {
  pageNumber: number;
  // CSS width pdf.js renders the base texture at
  renderWidth: number;
  // Size the page currently occupies on screen
  displayWidth: number;
  // When set (== displayWidth), a sharpening render at this width is wanted
  refineWidth: number | null;
  onRefineDone: () => void;
}) {
  const [aspect, setAspect] = useState<number | null>(null);
  // Last completed sharpening render: which slot holds it and its width
  const [shown, setShown] = useState<{ slot: 'a' | 'b'; width: number } | null>(null);

  const refineDpr = (width: number) =>
    Math.min(
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      MAX_REFINE_WIDTH / width
    );

  const baseDpr = Math.min(
    (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1) * 2.5,
    MAX_CANVAS_WIDTH / renderWidth
  );

  const handleLoadSuccess = (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setAspect(viewport.height / viewport.width);
  };

  // A new render is pending whenever a refine width is wanted and differs
  // from what's already shown; it renders in the slot not currently shown
  const pendingWidth =
    refineWidth !== null && refineWidth !== shown?.width ? refineWidth : null;
  const pendingSlot: 'a' | 'b' = shown?.slot === 'a' ? 'b' : 'a';

  const renderRefineSlot = (slot: 'a' | 'b') => {
    const isShown = shown !== null && shown.slot === slot;
    const width = isShown ? shown.width : slot === pendingSlot ? pendingWidth : null;
    if (width === null) return null;
    return (
      <div
        key={slot}
        className={`absolute top-0 left-0 ${isShown ? '' : 'opacity-0 pointer-events-none'}`}
        style={{
          width,
          transform: isShown ? `scale(${displayWidth / width})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <Page
          key={`${slot}-${width}`}
          pageNumber={pageNumber}
          width={width}
          devicePixelRatio={refineDpr(width)}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          onRenderSuccess={() => {
            if (!isShown) {
              setShown({ slot, width });
              onRefineDone();
            }
          }}
        />
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden border-[0.5px] border-foreground"
      style={{
        width: displayWidth,
        height: displayWidth * (aspect ?? LETTER_ASPECT),
        // Own compositor layer: the border then scales with the gesture
        // transform instead of waiting for a re-raster
        transform: 'translateZ(0)',
      }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: renderWidth,
          transform: `scale(${displayWidth / renderWidth})`,
          transformOrigin: 'top left',
        }}
      >
        <Page
          pageNumber={pageNumber}
          width={renderWidth}
          devicePixelRatio={baseDpr}
          loading={null}
          onLoadSuccess={handleLoadSuccess}
        />
      </div>
      {renderRefineSlot('a')}
      {renderRefineSlot('b')}
    </div>
  );
}

interface GestureState {
  // Visual scale factor relative to the committed scale
  factor: number;
  // Vertical pan; horizontally the page stays locked to the viewport's
  // center column so it never drifts off-center and snaps back on release
  dy: number;
  anchorY: number;
  // Content rect at gesture start, for clamping against the page bounds
  rectTop: number;
  rectHeight: number;
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
  // Idle sharpening overlay: target width, and whether a render is running
  const [refineWidth, setRefineWidth] = useState<number | null>(null);
  const refineInFlight = useRef(false);
  // Bumped whenever a gesture ends, so the sharpening pass reschedules
  // even when the gesture didn't change the committed scale
  const [idleTick, setIdleTick] = useState(0);

  const startGesture = useCallback((anchorY: number) => {
    const content = contentRef.current;
    if (!content || gesture.current) return;
    const rect = content.getBoundingClientRect();
    gesture.current = {
      factor: 1,
      dy: 0,
      anchorY,
      rectTop: rect.top,
      rectHeight: rect.height,
    };
    // Scale around the viewport's horizontal center so the page stays
    // centered while zooming; vertically anchor at the fingers/cursor
    const originX = window.innerWidth / 2 - rect.left;
    content.style.transformOrigin = `${originX}px ${anchorY - rect.top}px`;
    content.style.willChange = 'transform';
    // Hide the pdf.js text/annotation layers (see globals.css) so the
    // browser only scales the canvas texture while the gesture runs
    containerRef.current?.classList.add('pdf-gesturing');
    // Cancel an in-flight sharpening render so it can't compete
    if (refineInFlight.current) {
      refineInFlight.current = false;
      setRefineWidth(null);
    }
  }, []);

  const updateGesture = useCallback((factor: number, midY?: number) => {
    const content = contentRef.current;
    const g = gesture.current;
    if (!content || !g) return;
    // Clamp visually so the gesture can't exceed the zoom limits
    g.factor = clampScale(committedScale.current * factor) / committedScale.current;
    let dy = midY !== undefined ? midY - g.anchorY : 0;
    // Glue the page to its vertical bounds while scaling, so releasing the
    // gesture never snaps: the top edge may not drop below its resting
    // position, and no gap may open at the bottom while content overflows
    const top = g.anchorY + (g.rectTop - g.anchorY) * g.factor + dy;
    const height = g.rectHeight * g.factor;
    const upper = PAD_TOP;
    const lower = Math.min(upper, window.innerHeight - PAD_BOTTOM - height);
    const clampedTop = Math.min(upper, Math.max(lower, top));
    dy += clampedTop - top;
    g.dy = dy;
    content.style.transform = `translateY(${dy}px) scale(${g.factor})`;
  }, []);

  const endGesture = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    const g = gesture.current;
    if (!content || !container || !g) return;
    gesture.current = null;
    setIdleTick((tick) => tick + 1);
    const next = clampScale(committedScale.current * g.factor);
    if (next === committedScale.current) {
      // Pure pan (or no-op): fold the translation into the scroll position
      content.style.transform = '';
      content.style.transformOrigin = '';
      content.style.willChange = '';
      container.classList.remove('pdf-gesturing');
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

  // Once a zoom level sits idle and the base texture would be upscaled,
  // schedule a crisp overlay render at the exact display size
  useEffect(() => {
    if (baseWidth === null) return;
    const displayWidth = baseWidth * scale;
    if (refineWidth === displayWidth) return;
    const dpr = window.devicePixelRatio || 1;
    const baseTexture = Math.min(baseWidth * dpr * 2.5, MAX_CANVAS_WIDTH);
    if (displayWidth * dpr <= baseTexture) return;
    const timer = setTimeout(() => {
      refineInFlight.current = true;
      setRefineWidth(displayWidth);
    }, 150);
    return () => clearTimeout(timer);
  }, [scale, baseWidth, idleTick, refineWidth]);

  const handleRefineDone = useCallback(() => {
    refineInFlight.current = false;
  }, []);

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
      const ge = e as Event & { clientY?: number };
      startGesture(ge.clientY ?? window.innerHeight / 2);
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
        startGesture(e.clientY);
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
  // zoom around the finger midpoint and pan vertically as it moves
  useEffect(() => {
    const container = containerRef.current;
    if (!container || 'GestureEvent' in window) return;
    let startDistance: number | null = null;
    const measure = (touches: TouchList) => ({
      distance: Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      ),
      midY: (touches[0].clientY + touches[1].clientY) / 2,
    });
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const m = measure(e.touches);
        startDistance = m.distance;
        startGesture(m.midY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDistance === null) return;
      e.preventDefault();
      const m = measure(e.touches);
      updateGesture(m.distance / startDistance, m.midY);
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
      const step = (factor: number) => {
        startGesture(window.innerHeight / 2);
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

  const displayWidth = baseWidth !== null ? baseWidth * scale : null;

  return (
    <div
      ref={containerRef}
      className="theme-root fixed inset-0 overflow-auto bg-background no-scrollbar"
      style={{ touchAction: 'pan-x pan-y' }}
    >
      <div className="flex h-fit w-fit min-h-full min-w-full">
        <div className="mx-auto px-9 pt-9 pb-40">
          {baseWidth !== null && displayWidth !== null && (
            <div ref={contentRef}>
              <Document
                file={RESUME_PDF}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={null}
                error={
                  <p className="font-normal text-[12px] tracking-[-0.24px] leading-normal">
                    failed to load resume
                  </p>
                }
                className="flex flex-col gap-6"
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <FixedResPage
                    key={index}
                    pageNumber={index + 1}
                    renderWidth={baseWidth}
                    displayWidth={displayWidth}
                    refineWidth={refineWidth === displayWidth ? refineWidth : null}
                    onRefineDone={handleRefineDone}
                  />
                ))}
              </Document>
            </div>
          )}
        </div>
      </div>

      <ProgressiveBlur />

      {/* Actions - fixed so they stay put while the pdf zooms underneath.
          They take the theme foreground colour like the rest of the page. */}
      <div className="fixed bottom-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 font-normal text-[12px] tracking-[-0.24px] leading-normal whitespace-nowrap">
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
