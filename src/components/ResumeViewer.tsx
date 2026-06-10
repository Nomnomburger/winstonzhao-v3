'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Single source of truth for the resume file — replace public/winstonzhao-resume.pdf to update
const RESUME_PDF = '/winstonzhao-resume.pdf';

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const PAGE_ASPECT_RATIO = 11 / 8.5; // US letter portrait

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

// Stacked backdrop-filter layers, each masked to a band, so the blur ramps
// up smoothly from nothing down to the bottom edge of the page
const BLUR_LAYERS = [
  { blur: 0.5, stops: [0, 12.5, 25, 37.5] },
  { blur: 1, stops: [12.5, 25, 37.5, 50] },
  { blur: 2, stops: [25, 37.5, 50, 62.5] },
  { blur: 4, stops: [37.5, 50, 62.5, 75] },
  { blur: 8, stops: [50, 62.5, 75, 87.5] },
  { blur: 16, stops: [62.5, 75, 87.5, 100] },
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

export default function ResumeViewer() {
  const router = useRouter();
  const [numPages, setNumPages] = useState(0);
  const [baseWidth, setBaseWidth] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const pinchDistance = useRef<number | null>(null);

  // Fit the page within the viewport at scale 1
  useEffect(() => {
    const compute = () => {
      const width = Math.min(
        680,
        window.innerWidth - 72,
        (window.innerHeight - 180) / PAGE_ASPECT_RATIO
      );
      setBaseWidth(Math.max(260, width));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Zoom with trackpad pinch / ctrl+scroll / cmd+scroll
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => clampScale(s * Math.exp(-e.deltaY * 0.002)));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Zoom with +/- keys, reset with 0, close with escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        setScale((s) => clampScale(s * 1.2));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => clampScale(s / 1.2));
      } else if (e.key === '0') {
        setScale(1);
      } else if (e.key === 'Escape') {
        router.push('/');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  // Pinch zoom on touch devices
  const touchDistance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchDistance.current = touchDistance(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance.current !== null) {
      const distance = touchDistance(e.touches);
      const previous = pinchDistance.current;
      pinchDistance.current = distance;
      setScale((s) => clampScale(s * (distance / previous)));
    }
  };

  const handleTouchEnd = () => {
    pinchDistance.current = null;
  };

  const pageWidth = baseWidth ? baseWidth * scale : undefined;

  return (
    <div
      className="fixed inset-0 overflow-auto bg-background"
      style={{ touchAction: 'pan-x pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex h-fit w-fit min-h-full min-w-full">
        <div className="m-auto px-9 pt-9 pb-40">
          {baseWidth !== null && (
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
                <div
                  key={index}
                  className="border-[0.5px] border-black"
                  style={{ width: pageWidth }}
                >
                  <Page
                    pageNumber={index + 1}
                    width={pageWidth}
                    loading={null}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>

      <ProgressiveBlur />

      {/* Actions - fixed so they stay put while the pdf zooms underneath */}
      <div className="fixed bottom-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 font-normal text-[12px] tracking-[-0.24px] leading-normal text-[#1E1E1E] dark:text-white whitespace-nowrap">
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
