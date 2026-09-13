import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectPage from '@/components/project/ProjectPage';
import { getProjectBySlug } from '../../../../sanity/lib/projects';

// Serve cached project pages and refresh them from Sanity at most once a minute.
export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return { title: 'Project not found — Winston Zhao' };
  }
  return {
    title: `${project.title} — Winston Zhao`,
    description: project.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    notFound();
  }
  return <ProjectPage project={project} />;
}
