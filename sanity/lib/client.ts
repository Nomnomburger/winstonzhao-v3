import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Next's 60-second revalidation controls freshness without a second CDN cache.
  useCdn: false,
  perspective: 'published',
  // Local previews can point the client at a stand-in query API (never set in
  // production); the real API is used whenever SANITY_API_HOST is unset.
  ...(process.env.SANITY_API_HOST
    ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false }
    : {}),
})
