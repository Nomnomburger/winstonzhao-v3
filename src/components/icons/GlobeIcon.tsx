import type { SVGProps } from 'react';

/** 12px globe icon shown next to the local time (exported from Figma). */
export default function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
      <path
        d="M6.00195 0.5C6.49114 0.5 7.08211 0.931689 7.58008 1.97266C8.06059 2.97737 8.37207 4.40094 8.37207 6C8.37207 7.59906 8.06059 9.02263 7.58008 10.0273C7.08211 11.0683 6.49114 11.5 6.00195 11.5C5.51286 11.4998 4.92263 11.068 4.4248 10.0273C3.94429 9.02263 3.63281 7.59906 3.63281 6C3.63281 4.40094 3.94429 2.97737 4.4248 1.97266C4.92263 0.932026 5.51286 0.50025 6.00195 0.5Z"
        stroke="currentColor"
      />
      <line y1="5.75977" x2="11.4783" y2="5.75977" stroke="currentColor" />
    </svg>
  );
}
