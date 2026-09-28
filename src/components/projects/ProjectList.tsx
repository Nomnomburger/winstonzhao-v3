'use client';

import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { imageUrl, imageAspect } from '@/lib/image';
import type { ProjectCardData } from './types';

// The thumbnail that trails the cursor while hovering a row. It sits just to
// the right of the pointer (or to the left near the window's right edge) and
// eases after it with a spring so it lags a little behind.
const THUMB_WIDTH = 280;
const CURSOR_GAP = 24;
// Closest the thumbnail gets to the window's edges
const EDGE_MARGIN = 16;
const FOLLOW_SPRING = { stiffness: 350, damping: 35, mass: 0.6 } as const;

function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return canHover;
}

interface ProjectListProps {
  projects: ProjectCardData[];
  learnMoreLabel: string;
}

export default function ProjectList({ projects, learnMoreLabel }: ProjectListProps) {
  const canHover = useCanHover();
  const [hovered, setHovered] = useState<string | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, FOLLOW_SPRING);
  const springY = useSpring(y, FOLLOW_SPRING);
  const placed = useRef(false);

  const hoveredProject = projects.find((p) => p._id === hovered);
  const heightOf = (project?: ProjectCardData) => THUMB_WIDTH / imageAspect(project?.coverImage);
  const thumbHeight = heightOf(hoveredProject);

  const moveTo = (clientX: number, clientY: number, height = thumbHeight) => {
    const flip = clientX + CURSOR_GAP + THUMB_WIDTH > window.innerWidth - EDGE_MARGIN;
    const nextX = flip ? clientX - CURSOR_GAP - THUMB_WIDTH : clientX + CURSOR_GAP;
    // Centred on the cursor, but kept fully on screen near the top or bottom
    const nextY = Math.max(
      EDGE_MARGIN,
      Math.min(clientY - height / 2, window.innerHeight - height - EDGE_MARGIN),
    );
    x.set(nextX);
    y.set(nextY);
    // On the first hover, start at the cursor instead of gliding in from 0,0
    if (!placed.current) {
      springX.jump(nextX);
      springY.jump(nextY);
      placed.current = true;
    }
  };

  if (projects.length === 0) return null;

  return (
    <div
      className="relative w-full"
      onMouseMove={(e) => moveTo(e.clientX, e.clientY)}
      onMouseLeave={() => {
        setHovered(null);
        placed.current = false;
      }}
    >
      <ul className="flex flex-col gap-2 w-full text-[12px] md:text-[14px] leading-[1.2]">
        {projects.map((project) => (
          <li key={project._id}>
            <Link
              href={`/projects/${project.slug}`}
              onMouseEnter={(e) => {
                moveTo(e.clientX, e.clientY, heightOf(project));
                setHovered(project._id);
              }}
              className={`grid grid-cols-1 md:grid-cols-2 gap-x-24 w-full transition-opacity duration-300 ${
                hovered && hovered !== project._id ? 'md:opacity-40' : 'opacity-100'
              }`}
            >
              <span className="flex items-start justify-between gap-4">
                <span className="flex-1 min-w-0 font-normal">{project.title}</span>
                {project.year && (
                  <span className="shrink-0 text-right whitespace-nowrap font-[450]">{project.year}</span>
                )}
              </span>
              <span className="hidden md:flex items-start justify-between gap-4">
                <span className="flex-1 min-w-0 font-[450] truncate">{project.description}</span>
                <span className="shrink-0 text-right whitespace-nowrap font-normal">{learnMoreLabel}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Cursor-following thumbnail, portalled to <body> so no transformed
          ancestor (entrance animations) can offset its fixed position. Every
          thumbnail stays mounted (hidden) so they're loaded before the first
          hover and swap instantly. */}
      {canHover && createPortal(
        <motion.div
          className="fixed top-0 left-0 z-40 pointer-events-none"
          style={{ x: springX, y: springY, width: THUMB_WIDTH }}
          aria-hidden="true"
        >
          <motion.div
            className="relative w-full overflow-hidden"
            initial={false}
            animate={{
              opacity: hoveredProject ? 1 : 0,
              scale: hoveredProject ? 1 : 0.92,
              height: thumbHeight,
            }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {projects.map((project) => {
              const src = imageUrl(project.coverImage, THUMB_WIDTH * 2);
              return (
                src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={project._id}
                    src={src}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: project._id === hovered ? 1 : 0 }}
                  />
                )
              );
            })}
          </motion.div>
        </motion.div>,
        document.body,
      )}
    </div>
  );
}
