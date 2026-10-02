// Keep a real blur on the glyphs while giving its fine-radius tail time to
// clear, rather than making the text effectively sharp early in the reveal.
export const TEXT_BLUR_REVEAL = [5, 4.25, 2.25, 0.8, 0];
export const TEXT_BLUR_TIMES = [0, 0.24, 0.58, 0.82, 1];
export const TEXT_BLUR_EASE = 'linear' as const;
