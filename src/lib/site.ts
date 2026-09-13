/**
 * Site-wide links and labels used by the home page and project pages.
 * Update these in one place; the components read from here.
 */
export const SITE = {
  name: 'Winston Zhao',
  email: 'hello@winstonzhao.ca',
  emailDisplay: 'hello [at] winstonzhao.ca',
  // TODO: point these at the real destinations.
  linkedin: 'https://www.linkedin.com/',
  resume: '/resume.pdf',
  oldSite: 'https://winstonzhao.ca',
  /** Label + IANA zone for the live clock in the header. */
  timeLabel: 'Toronto',
  timeZone: 'America/Toronto',
} as const;

/** Human-readable labels for the `tags` values defined in the Sanity project schema. */
export const TAG_LABELS: Record<string, string> = {
  uiux: 'UI/UX',
  branding: 'Branding',
  'case-study': 'Case Study',
  awards: 'Awards',
};
