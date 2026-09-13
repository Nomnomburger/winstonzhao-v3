/**
 * Resets the CMS content to a single template project that mirrors the
 * project page design in Figma ("Heatmap.com Redesign").
 *
 * It deletes every `project` document (published and drafts) plus any
 * leftover `playground` documents from the old schema, uploads a cover image,
 * and creates the template project.
 *
 * Run from the `studio` folder (uses your Sanity CLI login, no token needed):
 *
 *   npx sanity exec scripts/seed-template.ts --with-user-token
 *
 * Optional: SEED_COVER_IMAGE=/path/to/image.png to use a different cover.
 */
import {createReadStream, existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {getCliClient} from 'sanity/cli'

const TEMPLATE_ID = 'project-heatmap-redesign'

const coverImagePath = resolve(
  process.cwd(),
  process.env.SEED_COVER_IMAGE ?? '../public/images/placeholder-1.png',
)

const client = getCliClient({apiVersion: '2025-12-27'}).withConfig({perspective: 'raw'})

function paragraph(key: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
  }
}

function bullet(key: string, text: string) {
  return {...paragraph(key, text), listItem: 'bullet', level: 1}
}

function templateProject(coverAssetId: string | null) {
  return {
    _id: TEMPLATE_ID,
    _type: 'project',
    title: 'Heatmap.com Redesign',
    slug: {_type: 'slug', current: 'heatmap-redesign'},
    featured: true,
    tagline: 'Unifying a fragmented analytics platform',
    description:
      'During my Full Sprint internship in July 2024, I redesigned Heatmap’s interface to improve navigation and scalability. As new features expanded the platform, the UI became fragmented. This case study details the process of creating a more cohesive and user-friendly design.',
    year: 2024,
    client: 'Full Sprint — Heatmap.com',
    link: 'https://heatmap.com',
    tags: ['uiux'],
    ...(coverAssetId
      ? {coverImage: {_type: 'image', asset: {_type: 'reference', _ref: coverAssetId}}}
      : {}),
    statement:
      'Redefining the analytics experience at Heatmap by unifying fragmented workflows into a cohesive, scalable, and user-friendly interface.',
    role: 'Product Design Intern',
    timeline: 'Summer 2024 — 2 months',
    skills: ['User Research', 'Competitive Analysis', 'Wire framing', 'Prototyping', 'Figma'],
    overview:
      'As a Product Design Intern at Full Sprint, I was tasked with reimagining the interface for Heatmap, an analytics platform that helps small businesses understand user behaviour through heatmaps, screen recordings, and AI insights. With new features added over time, the platform’s interface became fragmented and difficult to navigate. This case study outlines the redesign process to create a unified, scalable experience aligned with Heatmap’s evolving design language.',
    impact:
      'Redefining the analytics experience at Heatmap by unifying fragmented workflows into a cohesive, scalable, and user-friendly interface.',
    sections: [
      {
        _type: 'section',
        _key: 'problem-statement',
        title: 'Problem Statement',
        heading:
          'How might we turn Heatmap’s cluttered, inconsistent interface into a cohesive platform that’s easy to navigate and ready to scale?',
        body: [
          paragraph(
            'ps-intro',
            "Imagine walking into a house where new furniture had been added whenever needed, without consideration for the overall layout or style. A modern sectional sofa sits next to a vintage rocking chair, while a minimalist coffee table clashes with an ornate cabinet. That's what Heatmap's interface had become – a collection of mismatched features that, while individually functional, created a confusing and disjointed experience. The result:",
          ),
          paragraph('ps-gap', ''),
          bullet(
            'ps-1',
            'Inconsistent navigation: The UI lacked a clear hierarchy or logical grouping of features.',
          ),
          bullet(
            'ps-2',
            'Fragmented design: The old interface felt incoherent as new modules were added arbitrarily.',
          ),
          bullet(
            'ps-3',
            'Increased cognitive load: Users struggled to find and learn new features in the disorganized layout.',
          ),
          bullet(
            'ps-4',
            'Unscalable structure: The existing framework could not smoothly accommodate expanding capabilities.',
          ),
        ],
      },
      {
        _type: 'section',
        _key: 'research',
        title: 'Research',
        heading: 'What did we learn from users and competitors?',
        body: [paragraph('research-1', 'Summarise interviews, competitive analysis and key insights here.')],
      },
      {
        _type: 'section',
        _key: 'design-process',
        title: 'Design Process',
        heading: 'From audit to wireframes to a scalable system.',
        body: [paragraph('process-1', 'Walk through the audit, information architecture, wireframes and iterations here.')],
      },
      {
        _type: 'section',
        _key: 'design-solutions',
        title: 'Design Solutions',
        heading: 'A unified navigation and a consistent component language.',
        body: [paragraph('solutions-1', 'Show the final screens and explain the key decisions here.')],
      },
      {
        _type: 'section',
        _key: 'next-steps',
        title: 'Next Steps',
        heading: 'Where the redesign goes from here.',
        body: [paragraph('next-1', 'List follow-ups, open questions and what you would do with more time.')],
      },
    ],
  }
}

async function run() {
  const ids = await client.fetch<string[]>('*[_type in ["project", "playground"]]._id')

  let coverAssetId: string | null = null
  if (existsSync(coverImagePath)) {
    const asset = await client.assets.upload('image', createReadStream(coverImagePath), {
      filename: 'heatmap-cover.png',
    })
    coverAssetId = asset._id
  } else {
    console.warn(`Cover image not found at ${coverImagePath}; the template will need one set in Studio.`)
  }

  const transaction = client.transaction()
  for (const id of ids) transaction.delete(id)
  transaction.createOrReplace(templateProject(coverAssetId))
  await transaction.commit()

  console.log(`Deleted ${ids.length} document(s) and created template project "${TEMPLATE_ID}".`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
