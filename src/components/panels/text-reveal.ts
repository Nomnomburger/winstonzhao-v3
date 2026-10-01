export const TEXT_REVEAL_MASK_EASE = [0.4, 0, 0.2, 1] as const;
export const TEXT_REVEAL_MASK_FINISH = 0.3;

// Keep the lower edge tight for the rise, then open it for the descenders.
export function revealMaskAnimation(delay: number, duration: number, instant = false, openRight = false) {
  const right = openRight ? '-200%' : '-0.5em';
  return {
    initial: instant ? false as const : { clipPath: `inset(-0.15em ${right} 0em -0.5em)` },
    animate: { clipPath: `inset(-0.15em ${right} -0.2em -0.5em)` },
    transition: {
      duration: instant ? 0 : duration * TEXT_REVEAL_MASK_FINISH,
      delay: instant ? 0 : delay + duration * (1 - TEXT_REVEAL_MASK_FINISH),
      ease: TEXT_REVEAL_MASK_EASE,
    },
  };
}
