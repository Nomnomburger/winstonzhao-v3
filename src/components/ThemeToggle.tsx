'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { cycleTheme } from './theme';

// The plus is four arms radiating from the centre (18,18) of a 36×36 viewBox.
// On click the arms "bloom": pathLength draws each one from the centre out to
// its tip (staggered), while the whole mark gives a small scale pop — then it
// settles back into the plus and cycles to the next colour theme.
const ARMS = [
  { x2: 18, y2: 0 }, // up
  { x2: 36, y2: 18 }, // right
  { x2: 18, y2: 36 }, // down
  { x2: 0, y2: 18 }, // left
];

interface ThemeToggleProps {
  className?: string;
  // Keep the slow idle rotation from the original spinning plus.
  spin?: boolean;
}

export default function ThemeToggle({ className = '', spin = true }: ThemeToggleProps) {
  const arms = useAnimationControls();
  const pop = useAnimationControls();

  const handleClick = () => {
    cycleTheme();
    pop.start({
      scale: [0.7, 1.12, 1],
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    });
    arms.start((i: number) => ({
      pathLength: [0, 1],
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
    }));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Change colour theme"
      className={`block cursor-pointer ${className}`}
    >
      <div className={`w-full h-full ${spin ? 'animate-spin-slow' : ''}`}>
        <motion.svg
          viewBox="0 0 36 36"
          fill="none"
          className="w-full h-full"
          animate={pop}
          style={{ transformOrigin: 'center' }}
        >
          {ARMS.map((arm, i) => (
            <motion.line
              key={i}
              custom={i}
              x1={18}
              y1={18}
              x2={arm.x2}
              y2={arm.y2}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 1 }}
              animate={arms}
            />
          ))}
        </motion.svg>
      </div>
    </button>
  );
}
