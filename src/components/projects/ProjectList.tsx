'use client';

import Link from 'next/link';
import { motion, useAnimate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { imageUrl, imageAspect } from '@/lib/image';
import CursorPreview, { useCursorPreview } from './CursorPreview';
import { revealTransition, TEXT_HIDDEN_Y, TEXT_MASK, useReveal } from './reveal';
import type { ProjectCardData } from './types';

// Width of the thumbnail that trails the cursor while hovering a row
const THUMB_WIDTH = 280;

// Rows that scroll into view together slide up one after another
const ROW_STAGGER = 0.06;
const MAX_ROW_DELAY = 0.6;
// Rows revealed within this long of each other count as one batch
const BATCH_MS = 100;

interface ProjectRowProps {
  project: ProjectCardData;
  dimmed: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  // Delay for this row within the batch of rows being revealed right now
  nextDelay: () => number;
}

// Each row slides up from behind its own bottom edge as it scrolls into view.
function ProjectRow({ project, dimmed, onMouseEnter, nextDelay }: ProjectRowProps) {
  const { ref, shown, still } = useReveal<HTMLLIElement>('some', '0px 0px -5% 0px');
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [shownAtMount] = useState(shown);
  const played = useRef(shownAtMount);

  useEffect(() => {
    if (!shown || played.current) return;
    played.current = true;
    animate(scope.current, { y: '0%' }, revealTransition(still, 0.9, nextDelay()));
  }, [shown, still, animate, scope, nextDelay]);

  return (
    <li ref={ref}>
      <Link
        href={`/projects/${project.slug}`}
        onMouseEnter={onMouseEnter}
        className={`block w-full transition-opacity duration-300 ${dimmed ? 'md:opacity-40' : 'opacity-100'}`}
      >
        <span className="block" style={TEXT_MASK}>
          <motion.span
            ref={scope}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-24 w-full"
            initial={{ y: shownAtMount ? '0%' : TEXT_HIDDEN_Y }}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="flex-1 min-w-0 font-normal">{project.title}</span>
              {project.year && (
                <span className="shrink-0 text-right whitespace-nowrap font-[450]">{project.year}</span>
              )}
            </span>
            <span className="hidden md:flex items-start justify-between gap-4">
              <span className="flex-1 min-w-0 font-[450] truncate">{project.description}</span>
              <span aria-hidden="true" className="shrink-0 text-right font-normal">
                ↗
              </span>
            </span>
          </motion.span>
        </span>
      </Link>
    </li>
  );
}

export default function ProjectList({ projects }: { projects: ProjectCardData[] }) {
  const preview = useCursorPreview();
  const batch = useRef({ start: -Infinity, count: 0 });

  if (projects.length === 0) return null;

  const nextDelay = () => {
    const now = performance.now();
    if (now - batch.current.start > BATCH_MS) batch.current = { start: now, count: 0 };
    return Math.min(batch.current.count++ * ROW_STAGGER, MAX_ROW_DELAY);
  };

  return (
    <div className="relative w-full" onMouseMove={preview.move} onMouseLeave={preview.hide}>
      <ul className="flex flex-col gap-2 w-full text-[12px] md:text-[14px] leading-[1.2]">
        {projects.map((project) => (
          <ProjectRow
            key={project._id}
            project={project}
            dimmed={!!preview.active && preview.active !== project._id}
            onMouseEnter={(e) =>
              preview.show(project._id, e, {
                width: THUMB_WIDTH,
                height: THUMB_WIDTH / imageAspect(project.coverImage),
              })
            }
            nextDelay={nextDelay}
          />
        ))}
      </ul>

      <CursorPreview
        preview={preview}
        images={projects.map((project) => {
          const src = imageUrl(project.coverImage, THUMB_WIDTH * 2);
          return {
            key: project._id,
            // eslint-disable-next-line @next/next/no-img-element
            content: src && <img src={src} alt="" />,
          };
        })}
      />
    </div>
  );
}
