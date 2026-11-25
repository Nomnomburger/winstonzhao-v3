'use client';

import Link from 'next/link';
import { motion, useAnimate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { imageUrl, imageAspect } from '@/lib/image';
import { sortProjectList } from '@/lib/project-order';
import CursorPreview, { useCursorPreview } from './CursorPreview';
import { revealTransition, TEXT_HIDDEN_Y, TEXT_MASK, useReveal } from './reveal';
import type { ProjectCardData } from './types';

// Width of the thumbnail that trails the cursor while hovering a row
const THUMB_WIDTH = 280;

// When the list scrolls into view, every row slides up in order, top to
// bottom, as one staggered sequence (the whole list spread over at most
// MAX_STAGGER_SPREAD seconds).
const ROW_STAGGER = 0.06;
const MAX_STAGGER_SPREAD = 1;

interface ProjectRowProps {
  project: ProjectCardData;
  active: boolean;
  dimmed: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  // Whether the list has been revealed, and this row's delay within it
  shown: boolean;
  still: boolean;
  delay: number;
}

// Each row slides up from behind its own bottom edge once the list is revealed.
function ProjectRow({ project, active, dimmed, onMouseEnter, shown, still, delay }: ProjectRowProps) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [shownAtMount] = useState(shown);
  const played = useRef(shownAtMount);

  useEffect(() => {
    if (!shown || played.current) return;
    played.current = true;
    animate(scope.current, { y: '0%' }, revealTransition(still, 0.9, delay));
  }, [shown, still, animate, scope, delay]);

  return (
    <li>
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
              <span
                aria-hidden="true"
                className={`shrink-0 text-right font-normal transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${active ? 'rotate-45' : 'rotate-0'}`}
              >
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
  // One trigger for the whole list, so rows that reach the screen at different
  // moments (Lenis spreads a scroll over many frames) still play in order.
  const { ref, shown, still } = useReveal<HTMLUListElement>('some', '0px 0px -5% 0px');
  const orderedProjects = sortProjectList(projects);

  if (projects.length === 0) return null;

  const step = Math.min(ROW_STAGGER, MAX_STAGGER_SPREAD / Math.max(1, orderedProjects.length - 1));

  return (
    <div className="relative w-full" onMouseMove={preview.move} onMouseLeave={preview.hide}>
      <ul ref={ref} className="flex flex-col gap-2 w-full text-[12px] md:text-[14px] leading-[1.2]">
        {orderedProjects.map((project, index) => (
          <ProjectRow
            key={project._id}
            project={project}
            active={preview.active === project._id}
            dimmed={!!preview.active && preview.active !== project._id}
            onMouseEnter={(e) =>
              preview.show(project._id, e, {
                width: THUMB_WIDTH,
                height: THUMB_WIDTH / imageAspect(project.coverImage),
              })
            }
            shown={shown}
            still={still}
            delay={index * step}
          />
        ))}
      </ul>

      <CursorPreview
        preview={preview}
        images={orderedProjects.map((project) => {
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
