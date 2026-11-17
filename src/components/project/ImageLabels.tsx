import type { ImageLabel } from '@/lib/image';

// Short words such as "Before" and "After" placed over an image, at a
// position given as fractions of its width and height. They're page text,
// not part of the image, so they take the page's text colour and follow light,
// dark and colour themes (and fade with them). Used on the page and in the
// lightbox.
export default function ImageLabels({ labels, className = '' }: { labels?: ImageLabel[]; className?: string }) {
  const shown = (labels ?? []).filter(
    (l) => typeof l?.text === 'string' && l.text.trim() && typeof l.x === 'number' && Number.isFinite(l.x),
  );
  if (shown.length === 0) return null;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return (
    <>
      {shown.map((l, i) => (
        <span
          key={l._key ?? i}
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap leading-none tracking-[-0.02em] ${className}`}
          style={{
            left: `${clamp(l.x as number) * 100}%`,
            top: `${clamp(typeof l.y === 'number' && Number.isFinite(l.y) ? l.y : 0.04) * 100}%`,
          }}
        >
          {(l.text as string).trim()}
        </span>
      ))}
    </>
  );
}
