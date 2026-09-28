'use client';

import Link from 'next/link';
import { imageUrl, imageObjectPosition } from '@/lib/image';
import type { ProjectCardData } from './types';

// Featured projects are laid out on the 3-column grid in a repeating
// four-card rhythm (from the Figma home frame):
//   row 1: a wide card starting in column 1
//   row 2: a regular card in column 3
//   row 3: a regular card in column 1 and a wide card beside it
// Wide cards are 560px of a 2-column span at the 1280px reference (≈70%).
// Below md everything stacks full width.
type Slot = { className: string; wide: boolean };

const SLOTS: Slot[] = [
  { className: 'md:col-start-1 md:col-span-2 md:w-[70.2%]', wide: true },
  { className: 'md:col-start-3', wide: false },
  { className: 'md:col-start-1', wide: false },
  { className: 'md:col-start-2 md:col-span-2 md:w-[70.2%]', wide: true },
];

// Which cards share a row within each group of four.
const ROWS = [[0], [1], [2, 3]];

// In a row of two, the wide card's photo takes its height from the regular
// card beside it (instead of its own aspect ratio) so the captions line up at
// every width, not just the 1280px reference.
function FeaturedCard({ project, slot, paired }: { project: ProjectCardData; slot: Slot; paired: boolean }) {
  const src = imageUrl(project.coverImage, slot.wide ? 1400 : 1000);
  const shape = !slot.wide
    ? 'md:aspect-[387/398]'
    : paired
      ? 'md:aspect-auto md:flex-1'
      : 'md:aspect-[586/416]';
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`group flex flex-col gap-4 w-full ${slot.className}`}
    >
      <div
        className={`relative w-full overflow-hidden bg-foreground/5 aspect-[4/3] ${shape}`}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={project.coverImage?.alt || project.title}
            loading="lazy"
            style={{ objectPosition: imageObjectPosition(project.coverImage) }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="flex gap-4 items-start w-full text-[12px] md:text-[14px] tracking-[-0.24px] md:tracking-[-0.28px] leading-[1.2]">
        <p className="flex-1 min-w-0">{project.title}</p>
        {project.year && <p className="shrink-0 text-right whitespace-nowrap">{project.year}</p>}
      </div>
    </Link>
  );
}

export default function FeaturedProjects({ projects }: { projects: ProjectCardData[] }) {
  if (projects.length === 0) return null;

  // Chunk into groups of four, then into the rows of the rhythm above.
  const rows: { project: ProjectCardData; slot: Slot }[][] = [];
  for (let start = 0; start < projects.length; start += SLOTS.length) {
    ROWS.forEach((row) => {
      const cards = row
        .filter((i) => start + i < projects.length)
        .map((i) => ({ project: projects[start + i], slot: SLOTS[i] }));
      if (cards.length) rows.push(cards);
    });
  }

  return (
    <div className="flex flex-col gap-9 md:gap-6 w-full">
      {rows.map((cards, r) => (
        <div key={r} className="grid grid-cols-1 md:grid-cols-3 gap-9 md:gap-6 w-full">
          {cards.map(({ project, slot }) => (
            <FeaturedCard key={project._id} project={project} slot={slot} paired={cards.length > 1} />
          ))}
        </div>
      ))}
    </div>
  );
}
