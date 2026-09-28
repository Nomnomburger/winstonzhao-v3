export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-12-27'

// Defaults match the studio (studio/sanity.cli.ts) so the site builds even
// when the env vars aren't set.
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '7k8ajlip'
