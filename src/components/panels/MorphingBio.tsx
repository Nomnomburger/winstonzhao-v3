'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import HeroBioLine, { HeroBioExitWord } from './HeroBioLine';

interface MorphingBioProps {
  lines: readonly string[];
  expandedLines: readonly string[];
  expanded: boolean;
  progress: MotionValue<number>;
  renderLine: (line: string, index: number) => ReactNode;
  renderWord?: (word: string) => ReactNode;
  className?: string;
  revealAll?: boolean;
  freezeExit?: boolean;
  animateHeight?: boolean;
  closing?: boolean;
  layoutProgress?: MotionValue<number>;
}

export const HERO_BIO_LAYOUT_TRANSITION = {
  duration: 1.15,
  ease: [0.22, 1, 0.36, 1] as const,
};

// Sharpen independently of the quicker spatial ease, with a gradual finish.
const BIO_BLUR_EASE = [0.25, 0.1, 0.25, 1] as const;

interface BioWord {
  id: string;
  text: string;
  order: number;
  spaceAfter: boolean;
}

interface WordPosition {
  x: number;
  y: number;
  height: number;
}

const identityOf = (text: string) => text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '') || text;

// A bounded spatial phase keeps the common time curve while giving rows
// room to separate before their words settle into new horizontal positions.
function coordinatePhase(value: number, start: number, end: number) {
  const phase = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return phase * phase * (3 - 2 * phase);
}

// Title space and bio height open together ahead of the word alignment,
// so the mobile Projects heading follows one continuous layout change.
export const heroBioSpaceProgress = (progress: number) => coordinatePhase(progress, 0, 0.45);

function tokenize(lines: readonly string[]): BioWord[][] {
  const occurrences = new Map<string, number>();
  let order = 0;
  return lines.map((line) => {
    const pieces = line.match(/[\p{Script=Han}]|[^\s\p{Script=Han}]+|\s+/gu) ?? [];
    return pieces.flatMap((text, index) => {
      if (/^\s+$/.test(text)) return [];
      const identity = identityOf(text);
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      return [{
        id: `${identity}:${occurrence}`,
        text,
        order: order++,
        spaceAfter: /^\s+$/.test(pieces[index + 1] ?? ''),
      }];
    });
  });
}

// Preserve matching words, using their neighbors to distinguish repeated
// words or characters. Punctuation doesn't change their shared identity.
function sharedWords(shortLines: BioWord[][], longLines: BioWord[][]) {
  const shortWords = shortLines.flat();
  const longWords = longLines.flat();
  const used = new Set<string>();
  return shortWords.flatMap((word, shortIndex) => {
    const candidates = longWords.flatMap((long, longIndex) => {
      if (used.has(long.id) || identityOf(long.text) !== identityOf(word.text)) return [];
      let context = 0;
      for (const direction of [-1, 1]) {
        for (let distance = 1; distance <= 3; distance++) {
          const shortNeighbor = shortWords[shortIndex + direction * distance];
          const longNeighbor = longWords[longIndex + direction * distance];
          if (!shortNeighbor || !longNeighbor || identityOf(shortNeighbor.text) !== identityOf(longNeighbor.text)) break;
          context += 8 / distance;
        }
        // A nearby word may change sides when a phrase changes order.
        const shortNeighbor = shortWords[shortIndex + direction];
        const longNeighbor = longWords[longIndex - direction];
        if (shortNeighbor && longNeighbor && identityOf(shortNeighbor.text) === identityOf(longNeighbor.text)) context++;
      }
      return [{ long, context, sameOccurrence: long.id === word.id ? 1 : 0, longIndex }];
    });
    candidates.sort((a, b) => b.context - a.context || b.sameOccurrence - a.sameOccurrence || a.longIndex - b.longIndex);
    const match = candidates[0]?.long;
    if (!match) return [];
    used.add(match.id);
    return [{ short: word, long: match }];
  });
}

function measureWords(element: HTMLDivElement | null): Map<string, WordPosition> {
  const positions = new Map<string, WordPosition>();
  if (!element) return positions;
  const origin = element.getBoundingClientRect();
  const scaleX = element.offsetWidth ? origin.width / element.offsetWidth : 1;
  const scaleY = element.offsetHeight ? origin.height / element.offsetHeight : 1;
  element.querySelectorAll<HTMLElement>('[data-bio-word]').forEach((word) => {
    const rect = word.getBoundingClientRect();
    positions.set(word.dataset.bioWord!, {
      x: (rect.left - origin.left) / (scaleX || 1),
      y: (rect.top - origin.top) / (scaleY || 1),
      height: rect.height / (scaleY || 1),
    });
  });
  return positions;
}

function MeasurementLines({ words, elementRef, inFlow }: {
  words: BioWord[][];
  elementRef: React.RefObject<HTMLDivElement | null>;
  inFlow: boolean;
}) {
  return (
    <div ref={elementRef} aria-hidden className={`${inFlow ? 'relative' : 'absolute inset-x-0 top-0'} invisible pointer-events-none`}>
      {words.map((line, index) => (
        <p key={index}>
          {line.map((word) => (
            <Fragment key={word.id}>
              <span data-bio-word={word.id} className="inline-block align-bottom">{word.text}</span>
              {word.spaceAfter && ' '}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

function useContinuationReveal({ active, initialActive, activated, index, reducedMotion, elementRef }: {
  active: boolean;
  initialActive: boolean;
  activated: boolean;
  index: number;
  reducedMotion: boolean | null;
  elementRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  const y = useMotionValue(initialActive ? '0em' : '0.26em');
  const opacity = useMotionValue(initialActive ? 1 : 0);
  const blur = useMotionValue(initialActive ? 0 : 5);
  const filter = useTransform(blur, (radius) => `blur(${radius}px)`);
  const controls = useRef<ReturnType<typeof animate>[]>([]);
  useLayoutEffect(() => {
    controls.current.forEach((control) => control.stop());
    if (!activated) return;
    if (active && opacity.get() <= 0.001) {
      y.set('0.26em');
      blur.set(5);
    }
    const element = elementRef?.current;
    const lineHeight = element ? parseFloat(getComputedStyle(element).lineHeight) : 0;
    const row = element ? Math.max(0, Math.round(element.offsetTop / (lineHeight || element.offsetHeight || 1))) : index;
    const transition = {
      duration: reducedMotion ? 0 : active ? 0.67 : 0.29,
      delay: reducedMotion ? 0 : active ? 0.36 + Math.min(row * 0.017, 0.119) : row * 0.0085,
      ease: HERO_BIO_LAYOUT_TRANSITION.ease,
    };
    controls.current = [
      animate(y, active ? '0em' : '-0.16em', transition),
      animate(opacity, active ? 1 : 0, transition),
      animate(blur, active ? 0 : 5, { ...transition, ease: BIO_BLUR_EASE }),
    ];
    return () => controls.current.forEach((control) => control.stop());
  }, [activated, active, blur, elementRef, index, opacity, reducedMotion, y]);
  return { y, opacity, filter };
}

function ContinuationLine({ words, preserved, active, initialActive, activated, index, progress, wordCount, renderWord, reducedMotion }: {
  words: BioWord[];
  preserved: ReadonlySet<string>;
  active: boolean;
  initialActive: boolean;
  activated: boolean;
  index: number;
  progress: MotionValue<number>;
  wordCount: number;
  renderWord?: (word: string) => ReactNode;
  reducedMotion: boolean | null;
}) {
  const style = useContinuationReveal({ active, initialActive, activated, index, reducedMotion });
  return (
    <motion.p data-bio-line={index} className="text-reveal-word" style={style}>
      {words.map((word) => (
        <Fragment key={word.id}>
          <span className={preserved.has(word.id) ? 'invisible' : undefined}>
            <HeroBioExitWord progress={progress} order={word.order} wordCount={wordCount}>
              {renderWord ? renderWord(word.text) : word.text}
            </HeroBioExitWord>
          </span>
          {word.spaceAfter && ' '}
        </Fragment>
      ))}
    </motion.p>
  );
}

function ContinuationWord({ word, preserved, active, initialActive, activated, progress, wordCount, renderWord, reducedMotion }: {
  word: BioWord;
  preserved: boolean;
  active: boolean;
  initialActive: boolean;
  activated: boolean;
  progress: MotionValue<number>;
  wordCount: number;
  renderWord?: (word: string) => ReactNode;
  reducedMotion: boolean | null;
}) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const style = useContinuationReveal({ active, initialActive, activated, index: 0, reducedMotion, elementRef });
  return (
    <motion.span ref={elementRef} data-bio-continuation-word={word.id}
      className={`text-reveal-word inline-block align-bottom ${preserved ? 'invisible' : ''}`} style={style}>
      <HeroBioExitWord progress={progress} order={word.order} wordCount={wordCount}>
        {renderWord ? renderWord(word.text) : word.text}
      </HeroBioExitWord>
    </motion.span>
  );
}

function ContinuationBio({ words, preserved, active, initialActive, visible, activated, closing, progress, renderWord, reducedMotion }: {
  words: BioWord[][];
  preserved: ReadonlySet<string>;
  active: boolean;
  initialActive: boolean;
  visible: boolean;
  activated: boolean;
  closing: boolean;
  progress: MotionValue<number>;
  renderWord?: (word: string) => ReactNode;
  reducedMotion: boolean | null;
}) {
  const wordCount = words.flat().length;
  return (
    <div data-bio-plane={initialActive ? 'short' : 'long'} data-bio-active={active} aria-hidden inert={!visible || !active || closing || undefined} className={`absolute inset-0 ${visible ? '' : 'invisible'}`}>
      {words.length === 1 ? (
        <p data-bio-line={0}>
          {words[0].map((word) => (
            <Fragment key={word.id}>
              <ContinuationWord word={word} preserved={preserved.has(word.id)} active={active} initialActive={initialActive}
                activated={activated} progress={progress} wordCount={wordCount} renderWord={renderWord} reducedMotion={reducedMotion} />
              {word.spaceAfter && ' '}
            </Fragment>
          ))}
        </p>
      ) : words.map((line, index) => (
        <ContinuationLine key={index} words={line} preserved={preserved} active={active} initialActive={initialActive}
          activated={activated} index={index} progress={progress} wordCount={wordCount} renderWord={renderWord} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}

function DirectBio({ words, active, closing, reducedMotion, renderWord }: {
  words: BioWord[][];
  active: boolean;
  closing: boolean;
  reducedMotion: boolean | null;
  renderWord?: (word: string) => ReactNode;
}) {
  return (
    <div
      aria-hidden
      inert={!active || closing || undefined}
      className={`absolute inset-0 ${active ? '' : 'invisible'} pointer-events-none`}
    >
      {words.map((line, index) => (
        <p key={index}>
          {line.map((word) => {
            const transition = {
              duration: !active || reducedMotion ? 0 : closing ? 0.38 : 1.08,
              delay: !active || reducedMotion ? 0 : closing
                ? Math.min(word.order * 0.007, 0.32)
                : word.order * 0.036,
              ease: [0.4, 0, 0.2, 1] as const,
            };
            return (
              <Fragment key={word.id}>
                <motion.span
                  className="text-reveal-word inline-block align-bottom pointer-events-auto"
                  initial={{ y: '0.4em', opacity: 0, filter: 'blur(5px)' }}
                  animate={{
                    y: active ? closing ? '-0.4em' : '0em' : '0.4em',
                    opacity: active && !closing ? 1 : 0,
                    filter: active && !closing ? 'blur(0px)' : 'blur(5px)',
                  }}
                  transition={{ ...transition, filter: { ...transition, ease: BIO_BLUR_EASE } }}
                >
                  {renderWord ? renderWord(word.text) : word.text}
                </motion.span>
                {word.spaceAfter && ' '}
              </Fragment>
            );
          })}
        </p>
      ))}
    </div>
  );
}

export default function MorphingBio({
  lines, expandedLines, expanded, progress, renderLine, renderWord, className = '',
  revealAll = false, freezeExit = true, animateHeight = false, closing = false, layoutProgress,
}: MorphingBioProps) {
  const [activated, setActivated] = useState(expanded);
  if (expanded && !activated) setActivated(true);
  const directExpanded = expanded && revealAll;
  const heroExpanded = expanded && !closing;
  const [directState, setDirectState] = useState({ active: directExpanded, closing, cycle: 0 });
  if (directState.active !== directExpanded || directState.closing !== closing) {
    setDirectState({
      active: directExpanded, closing,
      cycle: directState.cycle + (directExpanded && (!directState.active || directState.closing && !closing) ? 1 : 0),
    });
  }
  const reducedMotion = useReducedMotion();
  const shortRef = useRef<HTMLDivElement>(null);
  const longRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sharedElements = useRef(new Map<string, HTMLSpanElement>());
  const shortHeight = useMotionValue(0);
  const longHeight = useMotionValue(0);
  const measuredHeights = useRef<{ short: number; long: number } | null>(null);
  const measurementAnimations = useRef<ReturnType<typeof animate>[]>([]);
  const internalLayoutProgress = useMotionValue(expanded ? 1 : 0);
  const heightProgress = layoutProgress ?? internalLayoutProgress;
  const height = useTransform(() => shortHeight.get() + (longHeight.get() - shortHeight.get()) * heroBioSpaceProgress(heightProgress.get()));
  const stationaryProgress = useMotionValue(0);
  const exitProgress = useTransform(progress, [0, 0.2, 0.45, 0.65, 0.8, 0.9, 1], [0, 0.08, 0.2, 0.35, 0.5, 0.65, 1]);
  const wordProgress = expanded && freezeExit ? stationaryProgress : exitProgress;
  const model = useMemo(() => {
    const shortLines = tokenize(lines);
    const longLines = tokenize(expandedLines);
    const shared = sharedWords(shortLines, longLines);
    return {
      shortLines, longLines, shared,
      shortPreserved: new Set(shared.map((word) => word.short.id)),
      longPreserved: new Set(shared.map((word) => word.long.id)),
    };
  }, [lines, expandedLines]);
  const signature = `${lines.join('\n')}\u0000${expandedLines.join('\n')}`;

  useLayoutEffect(() => {
    if (layoutProgress) return;
    const control = animate(internalLayoutProgress, heroExpanded ? 1 : 0, reducedMotion ? { duration: 0 } : HERO_BIO_LAYOUT_TRANSITION);
    return () => control.stop();
  }, [heroExpanded, internalLayoutProgress, layoutProgress, reducedMotion]);

  useLayoutEffect(() => {
    const measure = () => {
      const short = shortRef.current?.offsetHeight ?? 0;
      const long = longRef.current?.offsetHeight ?? 0;
      const previous = measuredHeights.current;
      if (previous?.short === short && previous.long === long) return;
      measurementAnimations.current.forEach((control) => control.stop());
      measurementAnimations.current = [];
      if (!previous || !animateHeight || reducedMotion) {
        shortHeight.set(short);
        longHeight.set(long);
        if (animateHeight && activated && rootRef.current) {
          const blend = heroBioSpaceProgress(heightProgress.get());
          rootRef.current.style.height = `${short + (long - short) * blend}px`;
        }
      } else {
        // Responsive rewrapping updates both endpoints on the same tween;
        // the externally shared expansion progress remains the sole driver.
        const transition = { duration: 0.2, ease: HERO_BIO_LAYOUT_TRANSITION.ease };
        measurementAnimations.current = [animate(shortHeight, short, transition), animate(longHeight, long, transition)];
      }
      measuredHeights.current = { short, long };
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (shortRef.current) observer.observe(shortRef.current);
    if (longRef.current) observer.observe(longRef.current);
    return () => observer.disconnect();
  }, [activated, animateHeight, heightProgress, longHeight, model, reducedMotion, shortHeight]);

  useLayoutEffect(() => {
    let shortPositions = measureWords(shortRef.current);
    let longPositions = measureWords(longRef.current);
    const placeSharedWords = () => {
      const blend = Math.max(0, Math.min(1, heightProgress.get()));
      model.shared.forEach((word) => {
        const element = sharedElements.current.get(word.short.id);
        const short = shortPositions.get(word.short.id);
        const long = longPositions.get(word.long.id);
        if (!element || !short || !long) return;
        // A word whose order reverses passes along its original row once
        // its rowmates have moved away, then descends into the cleared row.
        const passesAfterRowmates = model.shared.some((other) => {
          const otherShort = shortPositions.get(other.short.id);
          const otherLong = longPositions.get(other.long.id);
          return otherShort && otherLong && Math.abs(otherShort.y - short.y) < 0.5
            && Math.abs(otherLong.y - long.y) < 0.5
            && other.short.order < word.short.order && other.long.order > word.long.order;
        });
        // Narrow wrapping can merge a later source row into this word's
        // target row. Keep the upper, left-moving group one clear row above
        // the crossing corridor until its horizontal alignment has settled.
        const mergesAcrossRows = model.shared.some((other) => {
          const otherShort = shortPositions.get(other.short.id);
          const otherLong = longPositions.get(other.long.id);
          return otherShort && otherLong && short.y < otherShort.y - 0.5
            && Math.abs(long.y - otherLong.y) < 0.5
            && short.x > otherShort.x && long.x < otherLong.x;
        });
        // The last mobile row keeps its original horizontal clearance until
        // the growing bio has opened enough space above the Projects label.
        const waitsForHeight = animateHeight && long.y + long.height >= longHeight.get() - 0.5;
        const horizontal = waitsForHeight
          ? coordinatePhase(blend, 0.75, 1)
          : coordinatePhase(blend, 0.3, 0.75);
        const vertical = coordinatePhase(blend, 0, 0.3);
        const finalVertical = coordinatePhase(blend, 0.75, 1);
        const intermediateY = mergesAcrossRows ? Math.max(short.y, long.y - short.height * 2) : long.y;
        const x = short.x + (long.x - short.x) * horizontal;
        const y = passesAfterRowmates
          ? short.y + (long.y - short.y) * finalVertical
          : short.y + (intermediateY - short.y) * vertical + (long.y - intermediateY) * finalVertical;
        element.style.transform = `translateX(${x}px) translateY(${y}px)`;
      });
    };
    placeSharedWords();
    // Every shared word follows this same eased scalar, including reversals.
    // Its opacity and blur never participate in the continuation reveals.
    const unsubscribe = heightProgress.on('change', placeSharedWords);
    const resize = () => {
      shortPositions = measureWords(shortRef.current);
      longPositions = measureWords(longRef.current);
      placeSharedWords();
    };
    const measurementWords = [shortRef.current, longRef.current].flatMap((element) =>
      Array.from(element?.querySelectorAll<HTMLElement>('[data-bio-word]') ?? []));
    // Tracking changes can move words inside a paragraph without changing
    // its overall size. Include their local geometry so the shared words
    // follows language and font changes without interrupting a normal toggle.
    const measureDimensions = () => [
      shortRef.current?.offsetWidth, shortRef.current?.offsetHeight,
      longRef.current?.offsetWidth, longRef.current?.offsetHeight,
      ...measurementWords.map((word) => {
        const style = getComputedStyle(word);
        return `${word.offsetLeft}:${word.offsetTop}:${style.width}:${style.height}`;
      }),
    ].join('|');
    let dimensions = measureDimensions();
    const observer = new ResizeObserver(() => {
      const next = measureDimensions();
      if (next === dimensions) return;
      dimensions = next;
      resize();
    });
    if (shortRef.current) observer.observe(shortRef.current);
    if (longRef.current) observer.observe(longRef.current);
    measurementWords.forEach((word) => observer.observe(word));
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [activated, animateHeight, heightProgress, longHeight, model, signature]);

  useLayoutEffect(() => () => {
    measurementAnimations.current.forEach((control) => control.stop());
  }, []);
  const heroVisible = activated && !directExpanded;
  const prefixCount = (heroExpanded ? model.longLines : model.shortLines).flat().length;

  return (
    <motion.div ref={rootRef} className={`relative ${className}`} style={{ height: animateHeight && activated ? height : undefined }}>
      <div data-bio-plane="intro" aria-hidden={activated || undefined} inert={activated || undefined}
        className={activated ? 'absolute inset-x-0 top-0 invisible pointer-events-none' : undefined}>
        {lines.map((line, index) => (
          <HeroBioLine key={index} progress={progress} index={index} lines={lines}>{renderLine(line, index)}</HeroBioLine>
        ))}
      </div>
      <MeasurementLines words={model.shortLines} elementRef={shortRef} inFlow={activated && !expanded} />
      <MeasurementLines words={model.longLines} elementRef={longRef} inFlow={activated && expanded} />
      <ContinuationBio words={model.shortLines} preserved={model.shortPreserved} active={!heroExpanded} initialActive
        visible={heroVisible} activated={activated} closing={closing} progress={wordProgress} renderWord={renderWord} reducedMotion={reducedMotion} />
      <ContinuationBio words={model.longLines} preserved={model.longPreserved} active={heroExpanded} initialActive={false}
        visible={heroVisible} activated={activated} closing={closing} progress={wordProgress} renderWord={renderWord} reducedMotion={reducedMotion} />
      <div data-bio-plane="prefix" aria-hidden inert={!heroVisible || closing || undefined} className={`absolute inset-0 ${heroVisible ? '' : 'invisible'} pointer-events-none`}>
        {model.shared.map((word) => {
          const activeWord = heroExpanded ? word.long : word.short;
          return (
            <span key={word.short.id} data-bio-prefix={word.short.id} data-bio-shared={word.short.id} data-bio-from={word.short.text} data-bio-to={word.long.text} style={{ opacity: 1, filter: 'blur(0px)' }} ref={(element) => {
              if (element) sharedElements.current.set(word.short.id, element);
              else sharedElements.current.delete(word.short.id);
            }} className="text-reveal-word absolute left-0 top-0 inline-block whitespace-nowrap align-bottom pointer-events-auto">
              <HeroBioExitWord progress={wordProgress} order={activeWord.order} wordCount={prefixCount}>
                {renderWord ? renderWord(activeWord.text) : activeWord.text}
              </HeroBioExitWord>
            </span>
          );
        })}
      </div>
      <DirectBio key={directState.cycle} words={model.longLines} active={directExpanded} closing={closing}
        reducedMotion={reducedMotion} renderWord={renderWord} />
      {activated && <span className="sr-only">{(expanded ? expandedLines : lines).join(' ')}</span>}
    </motion.div>
  );
}
