'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { imageUrl, imageObjectPosition } from '@/lib/image';
import { FadeLine, MaskLine, revealTransition, useCaptionReveal, useReveal } from './reveal';
import type { ProjectCardData } from './types';

// Featured projects are laid out on the 3-column grid in a repeating
// four-card rhythm (from the Figma home frame):
//   row 1: a wide card starting in column 1, and a regular card in column 3
//          whose top lines up with the middle of the wide card's photo
//   row 2: a regular card in column 1 and a wide card beside it
// Wide cards are 560px of a 2-column span at the 1280px reference (≈70%).
// The first caption sits in the space beside its photo; the second sits
// above its photo without changing the desktop photo positions.
// Below md everything stacks full width with both captions beneath the photos.
type Slot = { className: string; wide: boolean };
type CaptionPlacement = 'bottom' | 'right' | 'top';

const SLOTS: Slot[] = [
  { className: 'md:col-start-1 md:col-span-2 md:self-start', wide: true },
  // Half the wide photo's height: 70.2% of two columns and a gutter, at the
  // 586/416 photo shape, is 49.84% of this column plus 6px.
  { className: 'md:col-start-3 md:self-start md:mt-[calc(49.84%+6px)]', wide: false },
  { className: 'md:col-start-1', wide: false },
  { className: 'md:col-start-2 md:col-span-2', wide: true },
];

// Which cards share a row within each group of four, and whether they're
// laid out as a pair (the second row) or with the offset card (the first).
const ROWS = [
  { cards: [0, 1], paired: false },
  { cards: [2, 3], paired: true },
];

// In a pair, both cards share the row's grid tracks (subgrid): the wide
// card's photo takes its height from the regular card beside it, instead of
// its own aspect ratio, and the captions start on the same line at every
// width, even when one title wraps.
//
// Photos wipe up from the bottom while settling from a slight zoom as they
// scroll into view, except the first two on desktop. The first two captions
// fade in with a small lift on each visit; the remaining captions slide up once.
function FeaturedCard({
  project,
  slot,
  paired,
  delay,
  captionPlacement,
  skipImageReveal,
}: {
  project: ProjectCardData;
  slot: Slot;
  paired: boolean;
  delay: number;
  captionPlacement: CaptionPlacement;
  skipImageReveal: boolean;
}) {
  const { ref, shown, still } = useReveal<HTMLAnchorElement>();
  const { ref: captionRef, shown: replayCaptionShown } = useCaptionReveal<HTMLDivElement>();
  const sideCaption = captionPlacement === 'right';
  const CaptionLine = captionPlacement === 'bottom' ? MaskLine : FadeLine;
  const captionShown = captionPlacement === 'bottom' ? shown : replayCaptionShown;
  const src = imageUrl(project.coverImage, slot.wide ? 1400 : 1000);
  const shape = !slot.wide
    ? 'md:aspect-[387/398]'
    : paired
      ? 'md:aspect-auto'
      : 'md:aspect-[586/416]';
  const caption = (
    <div ref={captionRef} className={`flex items-start w-full text-[12px] md:text-[14px] tracking-[-0.24px] md:tracking-[-0.28px] leading-[1.2] ${
      sideCaption ? 'gap-4 min-w-0 text-left md:flex-col md:gap-1' : 'gap-4'
    } ${
      captionPlacement === 'top' ? 'md:absolute md:bottom-full md:mb-4' : ''
    }`}>
      <div className={`flex-1 min-w-0 ${sideCaption ? 'md:flex-none md:whitespace-nowrap' : ''}`}>
        <CaptionLine shown={captionShown} still={still} delay={delay + 0.3}>
          {project.title}
        </CaptionLine>
      </div>
      {project.year && (
        <div className={`shrink-0 whitespace-nowrap text-right ${sideCaption ? 'md:text-left' : ''}`}>
          <CaptionLine shown={captionShown} still={still} delay={delay + 0.35}>
            {project.year}
          </CaptionLine>
        </div>
      )}
    </div>
  );
  return (
    <Link
      ref={ref}
      href={`/projects/${project.slug}`}
      className={`group relative flex flex-col gap-4 w-full ${slot.className} ${
        paired ? 'md:row-span-2 md:grid md:grid-rows-subgrid' : ''
      } ${
        sideCaption ? 'md:grid md:grid-cols-[70.2%_minmax(0,1fr)] md:items-start' : slot.wide ? 'md:w-[70.2%]' : ''
      }`}
    >
      <motion.div
        className={`relative w-full overflow-hidden bg-foreground/5 aspect-[4/3] ${shape}`}
        initial={false}
        animate={skipImageReveal ? undefined : { clipPath: shown ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)' }}
        transition={revealTransition(still, 1.1, delay)}
      >
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={skipImageReveal ? undefined : { scale: shown ? 1 : 1.15 }}
          transition={revealTransition(still, 1.4, delay)}
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
        </motion.div>
      </motion.div>
      {caption}
    </Link>
  );
}

export default function FeaturedProjects({
  projects,
  skipFirstImageReveals = false,
}: {
  projects: ProjectCardData[];
  skipFirstImageReveals?: boolean;
}) {
  if (projects.length === 0) return null;

  // Chunk into groups of four, then into the rows of the rhythm above.
  const rows: { cards: { project: ProjectCardData; slot: Slot }[]; paired: boolean }[] = [];
  for (let start = 0; start < projects.length; start += SLOTS.length) {
    ROWS.forEach((row) => {
      const cards = row.cards
        .filter((i) => start + i < projects.length)
        .map((i) => ({ project: projects[start + i], slot: SLOTS[i] }));
      if (cards.length) rows.push({ cards, paired: row.paired && cards.length > 1 });
    });
  }

  return (
    <div className="flex flex-col gap-9 md:gap-6 w-full">
      {rows.map(({ cards, paired }, r) => (
        <div key={r} className="grid grid-cols-1 md:grid-cols-3 gap-9 md:gap-6 w-full">
          {cards.map(({ project, slot }, i) => (
            <FeaturedCard
              key={project._id}
              project={project}
              slot={slot}
              paired={paired}
              captionPlacement={r === 0 ? (i === 0 ? 'right' : 'top') : 'bottom'}
              skipImageReveal={skipFirstImageReveals && r === 0}
              // The second card of a pair follows the first a beat later
              delay={paired ? i * 0.12 : 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
