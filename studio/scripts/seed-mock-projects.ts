/**
 * Adds (or refreshes) the mock projects in the Sanity dataset so the site has
 * something to show while testing. Run from the studio folder:
 *
 *   npx sanity exec scripts/seed-mock-projects.ts --with-user-token
 *
 * It uses your logged-in Sanity CLI session (run `npx sanity login` first if
 * needed). Placeholder photos are downloaded from picsum.photos and uploaded
 * as real image assets. Re-running replaces the mock projects in place.
 *
 * To remove every mock project again (with any unpublished edits to them and
 * the placeholder photos this script uploaded):
 *
 *   npx sanity exec scripts/seed-mock-projects.ts --with-user-token -- --delete
 */
import {getCliClient} from 'sanity/cli'
import {buildMockProjects, type MockAsset} from '../../sanity/mock/projects'

const client = getCliClient({apiVersion: '2025-01-01'})

// Marks the photos this script uploads, so --delete can find them again
const ASSET_SOURCE = 'mock-projects'

const uploaded = new Map<string, string>()

async function uploadImage(url: string): Promise<string> {
  const cached = uploaded.get(url)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not download ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const filename = `${url.split('/seed/')[1]?.split('/')[0] ?? 'mock'}.jpg`
  const asset = await client.assets.upload('image', buffer, {
    filename,
    source: {name: ASSET_SOURCE, id: filename, url},
  })
  uploaded.set(url, asset._id)
  return asset._id
}

const isMockAsset = (value: unknown): value is MockAsset =>
  typeof value === 'object' && value !== null && '_mock' in value

// Walks a document and swaps every `_mock` image placeholder for an uploaded
// asset reference.
async function resolveAssets(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(resolveAssets))
  if (isMockAsset(value)) {
    return {_type: 'reference', _ref: await uploadImage(value._mock.url)}
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = await resolveAssets(v)
    }
    return out
  }
  return value
}

async function run() {
  const projects = buildMockProjects()

  if (process.argv.includes('--delete')) {
    const tx = client.transaction()
    projects.forEach((p) => tx.delete(p._id).delete(`drafts.${p._id}`))
    await tx.commit()
    console.log(`Deleted ${projects.length} mock projects.`)

    const assetIds = await client.fetch<string[]>(
      '*[_type == "sanity.imageAsset" && source.name == $source]._id',
      {source: ASSET_SOURCE},
    )
    // One at a time (not one transaction): deleting a photo a real project
    // still uses is refused, and that shouldn't keep the others.
    let kept = 0
    for (const id of assetIds) {
      await client.delete(id).catch(() => kept++)
    }
    console.log(`Deleted ${assetIds.length - kept} placeholder photos.`)
    if (kept) console.warn(`Kept ${kept} placeholder photos that are still used by other documents.`)
    return
  }

  for (const project of projects) {
    const doc = (await resolveAssets(project)) as typeof project
    await client.createOrReplace(doc)
    console.log(`✓ ${project.title}${project.featured ? ' (featured)' : ''}`)
  }
  console.log(`\nAdded ${projects.length} mock projects. Open the studio to edit them.`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
