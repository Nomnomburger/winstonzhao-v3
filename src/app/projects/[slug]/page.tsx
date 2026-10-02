import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNextProject, getProject, getProjects } from '@/lib/projects';
import { imageUrl } from '@/lib/image';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectSections from '@/components/project/ProjectSections';
import { ImageFigure, VideoFigure } from '@/components/project/Media';
import { WZLogo } from '@/components/panels/shared';
import { EMAIL, RESUME_URL } from '@/lib/site';

// Pages are built ahead of time and refreshed from Sanity at most once a
// minute; projects published later are rendered on first visit.
export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  const description = project.description || project.intro;
  const image = imageUrl(project.coverImage, 1200, 630);
  const title = `${project.title} — Winston Zhao`;
  // These replace the site-wide openGraph and twitter blocks entirely, so
  // they repeat the shared fields.
  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: 'article',
      siteName: 'Winston Zhao',
      locale: 'en_US',
      title,
      description,
      url: `/projects/${project.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: project.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [project, next, projects] = await Promise.all([getProject(slug), getNextProject(slug), getProjects()]);
  if (!project) notFound();

  const hero = project.hero?.[0];
  // Details left empty in the studio (e.g. a pre-filled label with no value)
  // are skipped.
  const details = project.details?.filter((d) => d.value?.trim()) ?? [];
  const sections = project.sections ?? [];
  const hasMeta = project.client || project.discipline || project.year || project.link?.url;

  return (
    <main className="theme-root bg-background min-h-screen w-full overflow-x-clip">
      <ProjectHeader projectCount={projects.length} />

      {/* Title and intro */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 px-6 md:px-9 pt-16 md:pt-24 pb-6 md:pb-9">
        <h1 className="md:col-span-2 self-end font-medium text-[32px] md:text-[40px] tracking-[-0.04em] leading-[1.2]">
          {project.title}
        </h1>
        {project.intro && (
          <p className="md:col-start-3 text-[14px] text-justify leading-[1.2] whitespace-pre-line">
            {project.intro}
          </p>
        )}
      </section>

      {/* Client, discipline, year and link */}
      {hasMeta && (
        <section className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 px-6 md:px-9 text-[12px] md:text-[14px] tracking-[-0.02em] leading-[1.2]">
          <p className="text-justify">{project.client}</p>
          <p className="text-justify">{project.discipline}</p>
          <div className="col-span-2 md:col-span-1 flex items-center justify-between gap-4">
            <p>{project.year}</p>
            {project.link?.url && (
              <a href={project.link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {project.link.label || 'Visit'} ↗
              </a>
            )}
          </div>
        </section>
      )}

      {/* Hero image or video */}
      {hero && (
        <div className="p-6 md:p-9">
          {hero._type === 'mediaImage' ? (
            <ImageFigure image={hero} caption={hero.caption} sizes="100vw" priority />
          ) : (
            <VideoFigure video={hero} />
          )}
        </div>
      )}

      {/* Summary statement and key details */}
      {(project.summary || details.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 px-6 md:px-9 pt-6 md:pt-0 pb-6 md:pb-9">
          {project.summary && (
            <p className="md:col-span-2 lg:pr-64 text-[28px] md:text-[40px] tracking-[-0.02em] leading-[1.2] whitespace-pre-line">
              {project.summary}
            </p>
          )}
          {details.length > 0 && (
            <dl className="md:col-start-3 flex flex-col gap-6 text-[14px] text-justify leading-[1.2]">
              {details.map((d) => (
                <div key={d._key} className="flex flex-col gap-2">
                  <dt className="tracking-[-0.28px]">{d.label}</dt>
                  <dd className="whitespace-pre-line">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {/* Overview and impact */}
      {(project.overview || project.impact) && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 p-6 md:p-9">
          {project.overview && (
            <div className="flex flex-col gap-2 text-[14px] text-justify leading-[1.2]">
              <p className="tracking-[-0.28px]">Overview</p>
              <p className="whitespace-pre-line">{project.overview}</p>
            </div>
          )}
          {project.impact && (
            <div className="md:col-start-3 flex flex-col gap-2 leading-[1.2]">
              <p className="text-[14px] text-justify tracking-[-0.28px]">Impact</p>
              <p className="text-[28px] md:text-[40px] tracking-[-0.02em] whitespace-pre-line">
                {project.impact}
              </p>
            </div>
          )}
        </section>
      )}

      {sections.length > 0 && (
        <>
          <hr className="border-0 border-t border-foreground/[0.04] w-full" />
          <ProjectSections sections={sections} showSideMenu={project.showSideMenu !== false} />
        </>
      )}

      {/* Next project */}
      {next && next.slug !== project.slug && (
        <section className="px-6 md:px-9 pt-24 md:pt-48">
          <Link href={`/projects/${next.slug}`} className="group inline-flex flex-col gap-2 leading-[1.2]">
            <span className="text-[12px] md:text-[14px] tracking-[-0.02em]">Next project</span>
            <span className="font-medium text-[32px] md:text-[40px] tracking-[-0.04em] group-hover:underline">
              {next.title} →
            </span>
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="flex items-end justify-between gap-6 p-6 md:p-9 pt-24 md:pt-36">
        <Link href="/" aria-label="Home" className="block w-[45px] h-[28px] shrink-0">
          <WZLogo className="w-full h-full" />
        </Link>
        <div className="flex gap-3 items-center justify-end font-normal text-[12px] tracking-[-0.24px] leading-[1.2] whitespace-nowrap">
          <a href={`mailto:${EMAIL}`}>hello [at] winstonzhao.ca</a>
          <Link href={RESUME_URL}>resume</Link>
        </div>
      </footer>
    </main>
  );
}
