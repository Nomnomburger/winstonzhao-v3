import 'server-only';
import { groq } from 'next-sanity';
import { client } from '../../sanity/lib/client';
import { buildMockProjects, type MockAsset } from '../../sanity/mock/projects';
import type { ImageCrop, ImageHotspot } from './image';

// ---------------------------------------------------------------------------
// Types (the shapes returned by the queries below)

export interface SanityImage {
  _type?: string;
  _key?: string;
  asset?: {
    _id: string;
    url: string;
    metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
  };
  crop?: ImageCrop;
  hotspot?: ImageHotspot;
  alt?: string;
}

export interface MediaImage extends SanityImage {
  _type: 'mediaImage';
  _key: string;
  caption?: string;
  size?: 'content' | 'full';
}

export interface MediaVideo {
  _type: 'mediaVideo';
  _key: string;
  fileUrl?: string;
  url?: string;
  poster?: SanityImage;
  autoplay?: boolean;
  caption?: string;
  size?: 'content' | 'full';
}

export interface MediaGallery {
  _type: 'mediaGallery';
  _key: string;
  images?: SanityImage[];
  caption?: string;
}

export interface TextBlock {
  _type: 'block';
  _key: string;
  [key: string]: unknown;
}

export type BodyBlock = TextBlock | MediaImage | MediaVideo | MediaGallery;

export interface ProjectSection {
  _key: string;
  title: string;
  heading?: string;
  content?: BodyBlock[];
}

export interface ProjectSummary {
  _id: string;
  title: string;
  slug: string;
  year?: number;
  featured?: boolean;
  order?: number;
  description?: string;
  coverImage?: SanityImage;
}

export interface Project extends ProjectSummary {
  client?: string;
  discipline?: string;
  link?: { url?: string; label?: string };
  intro?: string;
  hero?: (MediaImage | MediaVideo)[];
  summary?: string;
  details?: { _key: string; label: string; value?: string }[];
  overview?: string;
  impact?: string;
  showSideMenu?: boolean;
  sections?: ProjectSection[];
}

// ---------------------------------------------------------------------------
// Queries

const imageFields = groq`..., asset->{_id, url, metadata{dimensions, lqip}}`;

const summaryFields = groq`
  _id,
  title,
  "slug": slug.current,
  year,
  featured,
  order,
  description,
  coverImage{${imageFields}}
`;

const mediaFields = groq`
  ...,
  _type == "mediaImage" => {${imageFields}},
  _type == "mediaVideo" => {"fileUrl": file.asset->url, poster{${imageFields}}},
  _type == "mediaGallery" => {images[]{${imageFields}}}
`;

// Keep seeded mocks and temporary test projects out of every public query.
const publicProjectFilter = groq`_type == "project" && !(_id match "mock-project-*") && !(lower(coalesce(title, "")) match "test project*")`;

const LIST_QUERY = groq`*[${publicProjectFilter} && defined(slug.current)]{${summaryFields}}`;

const PROJECT_QUERY = groq`*[${publicProjectFilter} && slug.current == $slug][0]{
  ${summaryFields},
  client,
  discipline,
  link,
  intro,
  hero[]{${mediaFields}},
  summary,
  details,
  overview,
  impact,
  showSideMenu,
  sections[]{
    _key,
    title,
    heading,
    content[]{${mediaFields}}
  }
}`;

// Content refreshes on the live site within a minute of publishing.
const REVALIDATE_SECONDS = 60;

// ---------------------------------------------------------------------------
// Mock projects stay hidden unless explicitly enabled with USE_MOCK_PROJECTS=1.
// This also applies in development and Vercel preview deployments.

const mocksOnly = () => process.env.USE_MOCK_PROJECTS === '1';

const isMockAsset = (value: unknown): value is MockAsset =>
  typeof value === 'object' && value !== null && '_mock' in value;

// Turns `_mock` placeholders into the resolved-asset shape the queries return.
function resolveMock(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(resolveMock);
  if (isMockAsset(value)) {
    const { url, width, height } = value._mock;
    return { _id: `mock-${url}`, url, metadata: { dimensions: { width, height } } };
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveMock(v);
    // Match the query's `slug.current` projection
    if (out._type === 'project') out.slug = (out.slug as { current: string }).current;
    return out;
  }
  return value;
}

const mockProjects = () => resolveMock(buildMockProjects()) as Project[];

// The home page only needs what the list query returns, not whole case studies.
const mockSummaries = (): ProjectSummary[] =>
  mockProjects().map(({ _id, title, slug, year, featured, order, description, coverImage }) => ({
    _id,
    title,
    slug,
    year,
    featured,
    order,
    description,
    coverImage,
  }));

// Home page order: the "Sort order" field (lowest first), then newest year.
function sortProjects<T extends ProjectSummary>(projects: T[]): T[] {
  return [...projects].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) || (b.year ?? 0) - (a.year ?? 0),
  );
}

export async function getProjects(): Promise<ProjectSummary[]> {
  if (mocksOnly()) return sortProjects(mockSummaries());
  let projects: ProjectSummary[] = [];
  try {
    projects = await client.fetch<ProjectSummary[]>(
      LIST_QUERY,
      {},
      { next: { revalidate: REVALIDATE_SECONDS, tags: ['project'] } },
    );
  } catch (error) {
    // In production, fail loudly: during a revalidation this keeps the last
    // good page instead of caching one with no projects.
    if (process.env.NODE_ENV === 'production') throw error;
    console.error('Could not load projects from Sanity:', error);
  }
  return sortProjects(projects);
}

export async function getProject(slug: string): Promise<Project | null> {
  // Slugs arrive URL-encoded (e.g. a space as %20); match the stored value.
  const decoded = decodeURIComponent(slug);
  if (mocksOnly()) return mockProjects().find((p) => p.slug === decoded) ?? null;
  let project: Project | null = null;
  try {
    project = await client.fetch<Project | null>(
      PROJECT_QUERY,
      { slug: decoded },
      { next: { revalidate: REVALIDATE_SECONDS, tags: ['project'] } },
    );
  } catch (error) {
    // Same as above: never turn a network error into a cached 404.
    if (process.env.NODE_ENV === 'production') throw error;
    console.error(`Could not load project "${decoded}" from Sanity:`, error);
  }
  return project;
}

// Next project in the home page order, wrapping around to the first.
export async function getNextProject(slug: string): Promise<ProjectSummary | null> {
  const projects = await getProjects();
  if (projects.length < 2) return null;
  const index = projects.findIndex((p) => p.slug === decodeURIComponent(slug));
  return projects[(index + 1) % projects.length] ?? null;
}
