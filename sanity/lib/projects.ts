import { groq, type PortableTextBlock } from 'next-sanity';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

import { client } from './client';

/** Fields shared by the home page cards/list and the project page header. */
export interface ProjectSummary {
  _id: string;
  title: string;
  slug: { current: string };
  year?: number;
  description?: string;
  tagline?: string;
  coverImage?: SanityImageSource;
  tags?: string[];
  featured?: boolean;
  client?: string;
}

export interface ProjectSection {
  _key: string;
  title: string;
  heading?: string;
  body?: PortableTextBlock[];
}

/** Everything needed to render /projects/[slug]. */
export interface ProjectDetail extends ProjectSummary {
  link?: string;
  statement?: string;
  role?: string;
  timeline?: string;
  skills?: string[];
  overview?: string;
  impact?: string;
  sections?: ProjectSection[];
}

const projectSummaryFields = groq`
  _id,
  title,
  slug,
  year,
  description,
  tagline,
  coverImage,
  tags,
  featured,
  client
`;

export const projectsQuery = groq`
  *[_type == "project" && defined(slug.current)] | order(year desc, _createdAt desc) {
    ${projectSummaryFields}
  }
`;

export const projectBySlugQuery = groq`
  *[_type == "project" && slug.current == $slug][0] {
    ${projectSummaryFields},
    link,
    statement,
    role,
    timeline,
    skills,
    overview,
    impact,
    sections[] {
      _key,
      title,
      heading,
      body[] {
        ...,
        _type == "image" => {
          ...,
          asset-> {
            _id,
            url,
            metadata { dimensions, lqip }
          }
        }
      }
    }
  }
`;

/** How long (seconds) Next.js may serve cached Sanity data before re-fetching. */
const REVALIDATE_SECONDS = 60;

/** All projects, newest first. Never throws: on a CMS error the site renders without projects. */
export async function getProjects(): Promise<ProjectSummary[]> {
  try {
    const projects = await client.fetch<ProjectSummary[]>(
      projectsQuery,
      {},
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    return projects ?? [];
  } catch (error) {
    console.error('Failed to fetch projects from Sanity:', error);
    return [];
  }
}

/** A single project for the detail page, or null when the slug is unknown. */
export async function getProjectBySlug(slug: string): Promise<ProjectDetail | null> {
  const project = await client.fetch<ProjectDetail | null>(
    projectBySlugQuery,
    { slug },
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  return project ?? null;
}

/**
 * Projects shown in the image grid on the home page: the ones flagged as
 * featured in the CMS, or the four most recent when nothing is flagged.
 */
export function selectFeaturedProjects(projects: ProjectSummary[]): ProjectSummary[] {
  const featured = projects.filter((project) => project.featured);
  return featured.length > 0 ? featured : projects.slice(0, 4);
}

export function projectHref(project: Pick<ProjectSummary, '_id' | 'slug'>): string {
  return `/projects/${project.slug?.current ?? project._id}`;
}
