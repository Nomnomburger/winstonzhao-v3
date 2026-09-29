'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { imageUrl, imageAspect } from '@/lib/image';
import CursorPreview, { useCursorPreview } from './CursorPreview';
import { REVEAL_EASE, useReveal } from './reveal';
import type { ProjectCardData } from './types';

// Width of the thumbnail that trails the cursor while hovering a row
const THUMB_WIDTH = 280;

// Rows slide up into view one after another once the list scrolls in
const ROW_STAGGER = 0.06;
const MAX_ROW_DELAY = 0.6;

export default function ProjectList({ projects }: { projects: ProjectCardData[] }) {
  const preview = useCursorPreview();
  const { ref, shown } = useReveal<HTMLUListElement>(0.15);

  if (projects.length === 0) return null;

  return (
    <div className="relative w-full" onMouseMove={preview.move} onMouseLeave={preview.hide}>
      <ul ref={ref} className="flex flex-col gap-2 w-full text-[12px] md:text-[14px] leading-[1.2]">
        {projects.map((project, i) => (
          <li key={project._id}>
            <Link
              href={`/projects/${project.slug}`}
              onMouseEnter={(e) =>
                preview.show(project._id, e, {
                  width: THUMB_WIDTH,
                  height: THUMB_WIDTH / imageAspect(project.coverImage),
                })
              }
              className={`block w-full transition-opacity duration-300 ${
                preview.active && preview.active !== project._id ? 'md:opacity-40' : 'opacity-100'
              }`}
            >
              {/* The row slides up from behind its own bottom edge (the mask
                  is a touch taller so descenders aren't clipped) */}
              <span className="block overflow-hidden pb-[0.15em] -mb-[0.15em]">
                <motion.span
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-24 w-full"
                  initial={false}
                  animate={{ y: shown ? '0%' : '115%' }}
                  transition={{
                    duration: 0.9,
                    delay: Math.min(i * ROW_STAGGER, MAX_ROW_DELAY),
                    ease: REVEAL_EASE,
                  }}
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
