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
// The board sits in the case study's text columns, so it only gets four
// note columns on wide screens; narrower, notes would get too thin to read.
const COLUMNS: Record<number, string> = {
  1: 'grid-cols-1 max-w-[260px] mx-auto',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
};
const MANY_COLUMNS = 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
// Colours that come from the theme fade with it (see .theme-root in
// globals.css) instead of switching ahead of the rest of the page.
const THEME_FADE = 'transition-[color,background-color,box-shadow] duration-[var(--theme-duration)]';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export default function StickyBoard({ board }: { board: StickyBoardData }) {
  const notes = (board.notes ?? []).filter((n) => n && text(n.text));
  if (notes.length === 0) return null;
  const label = text(board.label);
  const prompt = text(board.prompt);
  const caption = text(board.caption);
  return (
    <figure className="w-full">
      {(label || prompt) && (
        <div className={`mx-auto max-w-[780px] text-center ${prompt ? 'mb-8 md:mb-11' : 'mb-5 md:mb-6'}`}>
          {label && (
            <p className="mb-2 text-[12px] md:text-[14px] tracking-[0.02em] leading-[1.2] opacity-60">{label}</p>
          )}
          {prompt && (
            <p className="text-[20px] md:text-[28px] tracking-[-0.02em] leading-[1.2] whitespace-pre-line">{prompt}</p>
          )}
        </div>
      )}
      <ul
        role="list"
        className={`grid auto-rows-fr ${COLUMNS[notes.length] ?? MANY_COLUMNS} gap-x-3 gap-y-5 md:gap-x-6 md:gap-y-7 px-1 md:px-2`}
      >
        {notes.map((note, i) => {
          const highlight = text(note.highlight);
          const tag = text(note.tag);
          const color = note.color && Object.hasOwn(NOTE_COLORS, note.color) ? NOTE_COLORS[note.color] : NOTE_COLORS.yellow;
          return (
            <li
              key={note._key ?? i}
              className={`relative flex flex-col justify-between gap-3 min-h-[84px] md:min-h-[104px] rounded-[6px] px-3.5 pt-3.5 pb-3 md:px-[18px] md:pt-[18px] md:pb-4 text-[14px] md:text-[17px] leading-[1.22] tracking-[-0.01em] text-[#1b1b1b] ${
                highlight
                  ? `font-medium shadow-[0_0_0_3px_var(--foreground),0_10px_22px_-10px_rgba(0,0,0,0.3)] ${THEME_FADE}`
                  : 'shadow-[0_1px_1px_rgba(0,0,0,0.04),0_8px_18px_-10px_rgba(0,0,0,0.22)]'
              }`}
              style={{
                backgroundColor: highlight ? HIGHLIGHT_COLOR : color,
                transform: `rotate(${TILTS[i % TILTS.length]}deg)`,
              }}
            >
              {highlight && (
                <span
                  className={`absolute -top-2.5 md:-top-3 right-3 md:right-3.5 max-w-[calc(100%-1.5rem)] truncate whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-[11px] md:text-[13px] font-medium leading-none tracking-[0.01em] text-background ${THEME_FADE}`}
                >
                  {highlight}
                </span>
              )}
              <span className="whitespace-pre-line [overflow-wrap:anywhere]">{text(note.text)}</span>
              {tag && (
                <span className="text-[10px] md:text-[12px] font-medium uppercase tracking-[0.04em] leading-[1.2] text-[#1b1b1b]/70">
                  {tag}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {caption && (
        <figcaption className="mt-4 md:mt-5 text-[12px] md:text-[14px] tracking-[-0.02em] leading-[1.2]">{caption}</figcaption>
      )}
    </figure>
  );
}
