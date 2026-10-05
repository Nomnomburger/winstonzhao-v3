import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Next's 60-second revalidation controls freshness without a second CDN cache.
  useCdn: false,
  perspective: 'published',
})
