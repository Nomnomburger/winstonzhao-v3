import type { StickyBoard as StickyBoardData } from '@/lib/projects';

// Pastel notes with dark text look the same on any page colour, like paper
// notes. Everything outside the notes (label, prompt, highlight pill and
// ring, caption) takes the page's own colours, so the board reads in light,
// dark and the colour themes, and it has no background of its own.
const NOTE_COLORS: Record<string, string> = {
  yellow: '#FFF1A8',
  pink: '#FFD9E2',
  blue: '#D9ECFF',
  green: '#DDF3D3',
};
const HIGHLIGHT_COLOR = '#FFD84A';
// A small, fixed tilt per position, so the board looks hand-placed but
// renders the same on the server and in the browser.
const TILTS = [-1.4, 1.1, -0.6, 1.6, 0.9, -1.2, 1.3, -0.8, -1.5, 0.7, -0.5, 1.4, 1, -1.3, 0.6, -1];
const MD_COLUMNS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };

export default function StickyBoard({ board }: { board: StickyBoardData }) {
  const notes = (board.notes ?? []).filter((n) => n.text?.trim());
  if (notes.length === 0) return null;
  const mdColumns = MD_COLUMNS[notes.length] ?? 'md:grid-cols-4';
  return (
    <figure className="w-full">
      {(board.label || board.prompt) && (
        <div className="mx-auto mb-8 md:mb-11 max-w-[780px] text-center">
          {board.label && (
            <p className="mb-2 text-[12px] md:text-[14px] tracking-[0.02em] leading-[1.2] text-foreground/50">
              {board.label}
            </p>
          )}
          {board.prompt && (
            <p className="text-[20px] md:text-[28px] tracking-[-0.02em] leading-[1.2] whitespace-pre-line">
              {board.prompt}
            </p>
          )}
        </div>
      )}
      <ul role="list" className={`grid grid-cols-2 ${mdColumns} gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-7 px-1 md:px-2`}>
        {notes.map((note, i) => {
          const highlighted = Boolean(note.highlight);
          return (
            <li
              key={note._key ?? i}
              className={`relative flex flex-col justify-between gap-3 min-h-[84px] md:min-h-[104px] rounded-[6px] px-3.5 pt-3.5 pb-3 md:px-[18px] md:pt-[18px] md:pb-4 text-[14px] md:text-[17px] leading-[1.22] tracking-[-0.01em] text-[#1b1b1b] ${
                highlighted
                  ? 'font-medium shadow-[0_0_0_3px_var(--foreground),0_10px_22px_-10px_rgba(0,0,0,0.3)]'
                  : 'shadow-[0_1px_1px_rgba(0,0,0,0.04),0_8px_18px_-10px_rgba(0,0,0,0.22)]'
              }`}
              style={{
                backgroundColor: highlighted ? HIGHLIGHT_COLOR : NOTE_COLORS[note.color ?? 'yellow'] ?? NOTE_COLORS.yellow,
                transform: `rotate(${TILTS[i % TILTS.length]}deg)`,
              }}
            >
              {highlighted && (
                <span className="absolute -top-3 right-3 md:right-3.5 rounded-full bg-foreground px-2.5 py-1 text-[11px] md:text-[13px] font-medium leading-none tracking-[0.01em] text-background">
                  {note.highlight}
                </span>
              )}
              <span>{note.text}</span>
              {note.tag && (
                <span className="text-[10px] md:text-[12px] font-medium uppercase tracking-[0.04em] leading-[1.2] text-[#1b1b1b]/60">
                  {note.tag}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {board.caption && (
        <figcaption className="mt-6 md:mt-8 text-[12px] md:text-[14px] tracking-[-0.02em] leading-[1.2]">
          {board.caption}
        </figcaption>
      )}
    </figure>
  );
}
