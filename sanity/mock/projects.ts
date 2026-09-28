// Mock projects for testing the portfolio. Used in two places:
// - studio/scripts/seed-mock-projects.ts uploads them to the Sanity dataset
// - src/lib/projects.ts falls back to them in development when the dataset
//   has no projects (or can't be reached)
//
// Content is written in a compact shorthand and expanded into Sanity's
// document shape by `buildMockProjects`. Images are placeholder photos from
// picsum.photos; the seed script uploads them as real Sanity image assets.

type MockImage = {seed: string; w?: number; h?: number; alt?: string}

type MockBlock =
  | string // paragraph
  | {h3: string}
  | {bullets: string[]}
  | {image: MockImage; caption?: string; size?: 'content' | 'full'}
  | {video: string; caption?: string; size?: 'content' | 'full'; autoplay?: boolean}
  | {gallery: MockImage[]; caption?: string}

type MockSection = {title: string; heading?: string; content: MockBlock[]}

type MockProject = {
  id: string
  title: string
  slug: string
  year: number
  featured: boolean
  order?: number
  thumbnail: MockImage
  description: string
  client?: string
  discipline?: string
  link?: {url: string; label?: string}
  intro?: string
  hero?: {image: MockImage} | {video: string}
  summary?: string
  details?: {label: string; value: string}[]
  overview?: string
  impact?: string
  showSideMenu?: boolean
  sections?: MockSection[]
}

// A short CC0 clip (MDN's sample video) for testing video blocks.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'mock-project-heatmap',
    title: 'Heatmap.com Redesign',
    slug: 'heatmap-redesign',
    year: 2024,
    featured: true,
    order: 1,
    thumbnail: {seed: 'wz-heatmap', w: 1600, h: 1136, alt: 'Laptop showing the Heatmap dashboard'},
    description: 'Unifying a fragmented analytics platform into one cohesive interface.',
    client: 'Full Sprint — Heatmap.com',
    discipline: 'UI/UX',
    link: {url: 'https://heatmap.com', label: 'Visit'},
    intro:
      'During my Full Sprint internship in July 2024, I redesigned Heatmap’s interface to improve navigation and scalability. As new features expanded the platform, the UI became fragmented. This case study details the process of creating a more cohesive and user-friendly design.',
    hero: {image: {seed: 'wz-heatmap-hero', w: 2000, h: 1500, alt: 'Heatmap dashboard on a laptop'}},
    summary:
      'Redefining the analytics experience at Heatmap by unifying fragmented workflows into a cohesive, scalable, and user-friendly interface.',
    details: [
      {label: 'Role', value: 'Product Design Intern'},
      {label: 'Timeline', value: 'Summer 2024 — 2 months'},
      {
        label: 'Skills & Tools',
        value: 'User Research\nCompetitive Analysis\nWire framing\nPrototyping\nFigma',
      },
    ],
    overview:
      'As a Product Design Intern at Full Sprint, I was tasked with reimagining the interface for Heatmap, an analytics platform that helps small businesses understand user behaviour through heatmaps, screen recordings, and AI insights. With new features added over time, the platform’s interface became fragmented and difficult to navigate. This case study outlines the redesign process to create a unified, scalable experience aligned with Heatmap’s evolving design language.',
    impact:
      'Redefining the analytics experience at Heatmap by unifying fragmented workflows into a cohesive, scalable, and user-friendly interface.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'How might we turn Heatmap’s cluttered, inconsistent interface into a cohesive platform that’s easy to navigate and ready to scale?',
        content: [
          'Imagine walking into a house where new furniture had been added whenever needed, without consideration for the overall layout or style. A modern sectional sofa sits next to a vintage rocking chair, while a minimalist coffee table clashes with an ornate cabinet. That’s what Heatmap’s interface had become – a collection of mismatched features that, while individually functional, created a confusing and disjointed experience. The result:',
          {
            bullets: [
              'Inconsistent navigation: The UI lacked a clear hierarchy or logical grouping of features.',
              'Fragmented design: The old interface felt incoherent as new modules were added arbitrarily.',
              'Increased cognitive load: Users struggled to find and learn new features in the disorganized layout.',
              'Unscalable structure: The existing framework could not smoothly accommodate expanding capabilities.',
            ],
          },
        ],
      },
      {
        title: 'Research',
        heading: 'Understanding how small teams actually move through their analytics.',
        content: [
          'I started with a heuristic review of every screen and a competitive analysis of five analytics tools. Interviews with six customers showed that most sessions began on the same three pages, yet those pages were buried two levels deep.',
          {image: {seed: 'wz-research-board', w: 1600, h: 1000, alt: 'Research affinity map'}, caption: 'Affinity map from customer interviews', size: 'content'},
          {h3: 'Key insights'},
          {
            bullets: [
              'Users navigate by task, not by feature name.',
              'Settings and billing were mixed in with day-to-day tools.',
              'New features were discovered mostly through support tickets.',
            ],
          },
        ],
      },
      {
        title: 'Design Process',
        heading: 'From a tangle of menus to a navigation built around tasks.',
        content: [
          'I grouped every feature into four task-based areas and tested the structure with a tree test before moving into wireframes.',
          {gallery: [{seed: 'wz-wire-1', w: 1200, h: 900}, {seed: 'wz-wire-2', w: 1200, h: 900}, {seed: 'wz-wire-3', w: 1200, h: 900}], caption: 'Early wireframes'},
          'Short prototype recordings helped the team review interactions asynchronously:',
          {video: SAMPLE_VIDEO, caption: 'Prototype walkthrough (sample clip)', size: 'full', autoplay: true},
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'A single sidebar, consistent page headers and a component library to grow with.',
        content: [
          {image: {seed: 'wz-heatmap-final', w: 2000, h: 1250, alt: 'Final dashboard design'}, size: 'full'},
          'The final design introduces a persistent sidebar grouped by task, a shared page header pattern, and a component library that new features can build on without breaking the layout.',
        ],
      },
      {
        title: 'Next Steps',
        heading: 'Measuring adoption and extending the system.',
        content: [
          'Next, the team plans to measure feature discovery after launch and extend the component library to the marketing site.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-munisync',
    title: 'Munisync App',
    slug: 'munisync-app',
    year: 2024,
    featured: true,
    order: 2,
    thumbnail: {seed: 'wz-munisync', w: 1600, h: 1136, alt: 'Munisync app on a phone'},
    description: 'A mobile app that keeps students in sync with campus events.',
    client: 'School project',
    discipline: 'UI/UX',
    intro:
      'Mock content for testing. Munisync brings events, bookings and reminders into one mobile app. Replace this text with the real case study.',
    hero: {image: {seed: 'wz-munisync-hero', w: 2000, h: 1300, alt: 'Munisync screens'}},
    summary: 'Designing a calm, glanceable home for everything happening on campus.',
    details: [
      {label: 'Role', value: 'Product Designer'},
      {label: 'Timeline', value: 'Fall 2024 — 3 months'},
      {label: 'Team', value: '2 designers\n3 developers'},
    ],
    overview:
      'This mock project is here to show a shorter case study with fewer sections. Every part of the template is optional, so a project can be as long or short as it needs to be.',
    sections: [
      {
        title: 'Process',
        heading: 'Starting from the moments students check their phones.',
        content: [
          'Short paragraph of mock text describing the process.',
          {gallery: [{seed: 'wz-muni-1', w: 900, h: 1600}, {seed: 'wz-muni-2', w: 900, h: 1600}], caption: 'Key screens'},
        ],
      },
      {
        title: 'Outcome',
        content: ['Mock outcome text. Replace with the real results.'],
      },
    ],
  },
  {
    id: 'mock-project-transit',
    title: 'Transit Companion',
    slug: 'transit-companion',
    year: 2025,
    featured: true,
    order: 3,
    thumbnail: {seed: 'wz-transit', w: 1600, h: 1600, alt: 'Transit app concept'},
    description: 'A concept for calmer, more predictable commutes.',
    client: 'Personal project',
    discipline: 'UI/UX',
    intro: 'Mock content for testing a project whose hero is a video instead of an image.',
    hero: {video: SAMPLE_VIDEO},
    summary: 'Making real-time transit information feel calm instead of urgent.',
    details: [
      {label: 'Role', value: 'Designer'},
      {label: 'Timeline', value: '2025 — 4 weeks'},
    ],
    showSideMenu: false,
    sections: [
      {
        title: 'Concept',
        heading: 'One screen that answers “when should I leave?”',
        content: [
          'This mock project turns the side menu off, which suits short projects.',
          {image: {seed: 'wz-transit-2', w: 1600, h: 1000}, size: 'full'},
        ],
      },
    ],
  },
  {
    id: 'mock-project-identity',
    title: 'Studio Identity',
    slug: 'studio-identity',
    year: 2023,
    featured: true,
    order: 4,
    thumbnail: {seed: 'wz-identity', w: 1600, h: 1136, alt: 'Brand identity mockups'},
    description: 'A visual identity for a small design studio.',
    client: 'Freelance',
    discipline: 'Branding',
    intro: 'Mock content for testing a visual project that is mostly images.',
    hero: {image: {seed: 'wz-identity-hero', w: 2000, h: 1400}},
    showSideMenu: false,
    sections: [
      {
        title: 'Gallery',
        content: [
          {gallery: [{seed: 'wz-id-1', w: 1200, h: 1200}, {seed: 'wz-id-2', w: 1200, h: 1200}]},
          {image: {seed: 'wz-id-3', w: 2000, h: 1200}, size: 'full'},
          {gallery: [{seed: 'wz-id-4', w: 1200, h: 1500}, {seed: 'wz-id-5', w: 1200, h: 1500}, {seed: 'wz-id-6', w: 1200, h: 1500}]},
        ],
      },
    ],
  },
  ...[
    ['User Flow Optimization', 2025],
    ['Feature Prioritization', 2025],
    ['Cross-Platform Usability', 2025],
    ['Design System Integration', 2025],
    ['Responsive Design Principles', 2024],
    ['Accessibility Improvements', 2024],
    ['Interactive Prototyping', 2024],
    ['Journey Mapping', 2023],
  ].map(([title, year], i): MockProject => {
    const slug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return {
      id: `mock-project-${slug}`,
      title: String(title),
      slug,
      year: Number(year),
      featured: false,
      order: 10 + i,
      thumbnail: {seed: `wz-list-${slug}`, w: 1200, h: 900, alt: String(title)},
      description: 'Mock project for testing the list.',
      client: 'Mock project',
      discipline: 'UI/UX',
      intro: 'Mock content. Replace or delete this project in Sanity.',
      hero: {image: {seed: `wz-list-hero-${slug}`, w: 2000, h: 1300}},
      summary: `${title}: a short mock summary to test the template.`,
      details: [{label: 'Role', value: 'Product Designer'}],
      sections: [
        {
          title: 'Overview',
          heading: 'A short mock section.',
          content: ['Mock paragraph text for testing.'],
        },
      ],
    }
  }),
]

// ---------------------------------------------------------------------------
// Expansion into Sanity document shape

export const mockImageUrl = ({seed, w = 1600, h = 1200}: MockImage) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

// Placeholder for an image that still needs uploading. The seed script swaps
// it for a real asset reference; the dev fallback resolves it to its URL.
export type MockAsset = {_mock: {url: string; width: number; height: number}}

const mockAsset = (img: MockImage): MockAsset => ({
  _mock: {url: mockImageUrl(img), width: img.w ?? 1600, height: img.h ?? 1200},
})

type KeyGen = () => string

const span = (text: string, key: KeyGen) => ({_type: 'span', _key: key(), text, marks: []})

function expandBlock(block: MockBlock, key: KeyGen): Record<string, unknown>[] {
  if (typeof block === 'string') {
    return [{_type: 'block', _key: key(), style: 'normal', markDefs: [], children: [span(block, key)]}]
  }
  if ('h3' in block) {
    return [{_type: 'block', _key: key(), style: 'h3', markDefs: [], children: [span(block.h3, key)]}]
  }
  if ('bullets' in block) {
    return block.bullets.map((text) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      markDefs: [],
      children: [span(text, key)],
    }))
  }
  if ('image' in block) {
    return [
      {
        _type: 'mediaImage',
        _key: key(),
        asset: mockAsset(block.image),
        alt: block.image.alt ?? '',
        caption: block.caption,
        size: block.size ?? 'full',
      },
    ]
  }
  if ('video' in block) {
    return [
      {
        _type: 'mediaVideo',
        _key: key(),
        url: block.video,
        caption: block.caption,
        size: block.size ?? 'full',
        autoplay: block.autoplay ?? true,
      },
    ]
  }
  return [
    {
      _type: 'mediaGallery',
      _key: key(),
      caption: block.caption,
      images: block.gallery.map((img) => ({
        _type: 'image',
        _key: key(),
        asset: mockAsset(img),
        alt: img.alt ?? '',
      })),
    },
  ]
}

// Returns the mock projects as Sanity documents. Image fields hold `_mock`
// placeholders in place of asset references.
export function buildMockProjects() {
  let n = 0
  const key: KeyGen = () => `k${(n++).toString(36)}`

  return MOCK_PROJECTS.map((p) => ({
    _id: p.id,
    _type: 'project',
    title: p.title,
    slug: {_type: 'slug', current: p.slug},
    year: p.year,
    featured: p.featured,
    order: p.order,
    coverImage: {_type: 'image', asset: mockAsset(p.thumbnail), alt: p.thumbnail.alt ?? p.title},
    description: p.description,
    client: p.client,
    discipline: p.discipline,
    link: p.link,
    intro: p.intro,
    hero: p.hero
      ? [
          'image' in p.hero
            ? {_type: 'mediaImage', _key: key(), asset: mockAsset(p.hero.image), alt: p.hero.image.alt ?? '', size: 'full'}
            : {_type: 'mediaVideo', _key: key(), url: p.hero.video, autoplay: true, size: 'full'},
        ]
      : undefined,
    summary: p.summary,
    details: p.details?.map((d) => ({_type: 'detailItem', _key: key(), ...d})),
    overview: p.overview,
    impact: p.impact,
    showSideMenu: p.showSideMenu ?? true,
    sections: p.sections?.map((s) => ({
      _type: 'projectSection',
      _key: key(),
      title: s.title,
      heading: s.heading,
      content: s.content.flatMap((b) => expandBlock(b, key)),
    })),
  }))
}
