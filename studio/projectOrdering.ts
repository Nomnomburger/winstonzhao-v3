import {LexoRank} from 'lexorank'
import type {SanityClient} from 'sanity'

export const visibleProjectsFilter =
  '!(_id match "mock-project-*") && !(lower(coalesce(title, "")) match "test project*")'

interface ProjectPosition {
  _id: string
  _rev: string
  year?: number
  order?: number
}

const publishedId = (id: string) => id.replace(/^drafts\./, '')

// Give draft/published pairs the same rank without publishing any draft content.
export function newestFirstPatches(documents: ProjectPosition[]) {
  const projects = new Map<string, ProjectPosition>()
  for (const doc of documents) {
    const id = publishedId(doc._id)
    if (!projects.has(id) || !doc._id.startsWith('drafts.')) projects.set(id, doc)
  }
  const sorted = [...projects.entries()].sort(([idA, a], [idB, b]) => {
    const year = (b.year ?? 0) - (a.year ?? 0)
    if (year) return year
    const orderA = a.order ?? Infinity
    const orderB = b.order ?? Infinity
    if (orderA !== orderB) return orderA < orderB ? -1 : 1
    return idA < idB ? -1 : idA > idB ? 1 : 0
  })
  let rank = LexoRank.min()
  const ranks = new Map(sorted.map(([id]) => {
    rank = rank.genNext().genNext()
    return [id, rank.toString()]
  }))
  return documents.map(doc => ({
    id: doc._id,
    ifRevisionID: doc._rev,
    set: {orderRank: ranks.get(publishedId(doc._id))!},
  }))
}

// Structure menu actions support functions; the plugin's listening query updates
// the drag-and-drop list automatically after this transaction commits.
export function resetNewestFirstAction(client: SanityClient) {
  let pending = false
  return async () => {
    if (pending) return
    pending = true
    try {
      const documents = await client.withConfig({useCdn: false, perspective: 'raw'})
        .fetch<ProjectPosition[]>(`*[_type == "project" && !(_id in path("versions.**")) && ${visibleProjectsFilter}]{_id, _rev, year, order}`)
      const patches = newestFirstPatches(documents)
      if (!patches.length) return
      let transaction = client.transaction()
      for (const patch of patches) transaction = transaction.patch(patch.id, {
        ifRevisionID: patch.ifRevisionID,
        set: patch.set,
      })
      await transaction.commit({visibility: 'sync'})
      window.alert('Projects are now ordered by year, newest first. You can drag them into any order from here.')
    } catch {
      window.alert('Could not reset project order. Refresh the Studio and try again. Your reset was not saved.')
    } finally {
      pending = false
    }
  }
}
