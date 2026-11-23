import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNextProject, getProject, getProjects } from '@/lib/projects';
import { imageUrl } from '@/lib/image';
import ProjectHeader from '@/components/project/ProjectHeader';
import ProjectSections from '@/components/project/ProjectSections';
import ContentSnap from '@/components/project/ContentSnap';
import { ImageFigure, VideoFigure } from '@/components/project/Media';
import { ReadLink, RevealArea, RevealFade, RevealMedia, RevealText } from '@/components/project/Reveal';
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

      {/* The overview: everything above the case study. On desktop it fades
          out while the page snaps down to the case study, so none of it shows
          through the header's blur, and fades back in on the way up. */}
      <div
        id="overview"
        className="transition-opacity duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[faded]:opacity-0 data-[faded]:pointer-events-none"
      >
        {/* On phones the first screen keeps the title and intro at the top and
            sets the details and hero at the bottom, with open space between.
            The hero's own bottom padding (the side padding) then rests on the
            bottom of the screen as it first loads, with Safari's bars showing
            (svh), so it stays clear of them. Content taller than the screen
            flows as before. 65px is ProjectHeader's spacer; print undoes this
            (globals.css). */}
        <div
          data-first-screen
          className={hero ? 'max-md:flex max-md:flex-col max-md:min-h-[calc(100svh_-_65px)]' : undefined}
        >
          {/* Title and intro: the top of the page plays as soon as it loads. */}
          <RevealArea
            immediate
            as="section"
            className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 px-6 md:px-9 pt-16 md:pt-24 pb-6 md:pb-9"
          >
            <h1 className="md:col-span-2 self-end font-medium text-[32px] md:text-[40px] tracking-[-0.04em] leading-[1.2]">
              <RevealText delay={0.1}>{project.title}</RevealText>
            </h1>
            {project.intro && (
              <RevealFade delay={0.25} className="md:col-start-3">
                <p className="text-[14px] text-justify leading-[1.2] whitespace-pre-line">{project.intro}</p>
              </RevealFade>
            )}
          </RevealArea>

          <div className="max-md:mt-auto">
            {/* Client, discipline, year and link. On phones it's two lines: client
                and discipline on the left, year and link on the right. */}
            {hasMeta && (
              <RevealArea
                immediate
                as="section"
                className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-3 gap-x-6 gap-y-1 px-6 md:px-9 text-[14px] tracking-[-0.02em] leading-[1.2]"
              >
                <p className="col-start-1 row-start-1 text-justify">
                  <RevealText delay={0.3}>{project.client}</RevealText>
                </p>
                <p className="col-start-1 row-start-2 md:col-start-2 md:row-start-1 text-justify">
                  <RevealText delay={0.35}>{project.discipline}</RevealText>
                </p>
                <p className="col-start-2 row-start-1 md:col-start-3 text-right md:text-left">
                  <RevealText delay={0.4}>{project.year}</RevealText>
                </p>
                <div className="col-start-2 row-start-2 md:col-start-3 md:row-start-1 justify-self-end text-right">
                  <RevealText delay={0.45}>
                    {project.link?.url ? (
                      <a href={project.link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {project.link.label || 'Visit'} ↗
                      </a>
                    ) : (
                      <ReadLink target="read" />
                    )}
                  </RevealText>
                </div>
              </RevealArea>
            )}

            {/* Hero image or video */}
            {hero && (
              <RevealArea immediate className="p-6 md:p-9">
                <RevealMedia delay={0.1}>
                  {hero._type === 'mediaImage' ? (
                    <ImageFigure image={hero} caption={hero.caption} sizes="100vw" priority />
                  ) : (
                    <VideoFigure video={hero} />
                  )}
                </RevealMedia>
              </RevealArea>
            )}
          </div>
        </div>

        {/* Summary and overview, below the hero; "Read ↓" lands here. On desktop
            it ends with extra room above the screen's bottom edge where the page
            rests before the case study. */}
        <div id="read" tabIndex={-1} className="scroll-mt-[104px] md:pb-9 focus:outline-none">
          {/* Summary statement and key details */}
          {(project.summary || details.length > 0) && (
            <RevealArea
              as="section"
              className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 px-6 md:px-9 pt-6 md:pt-0 pb-6 md:pb-9"
            >
              {project.summary && (
                <p className="md:col-span-2 lg:pr-64 text-[28px] md:text-[40px] tracking-[-0.02em] leading-[1.2] whitespace-pre-line">
                  <RevealText>{project.summary}</RevealText>
                </p>
              )}
              {details.length > 0 && (
                <dl className="md:col-start-3 flex flex-col gap-6 text-[14px] text-justify leading-[1.2]">
                  {details.map((d, i) => (
                    <div key={d._key} className="flex flex-col gap-2">
                      <dt className="tracking-[-0.02em]">
                        <RevealText delay={0.1 + i * 0.05}>{d.label}</RevealText>
                      </dt>
                      <dd className="whitespace-pre-line">
                        <RevealText delay={0.13 + i * 0.05}>{d.value}</RevealText>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </RevealArea>
          )}

          {/* Overview and impact */}
          {(project.overview || project.impact) && (
            <RevealArea as="section" className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 p-6 md:p-9">
              {project.overview && (
                <div className="flex flex-col gap-2 text-[14px] text-justify leading-[1.2]">
                  <p className="tracking-[-0.02em]">
                    <RevealText>Overview</RevealText>
                  </p>
                  <RevealFade delay={0.1}>
                    <p className="whitespace-pre-line">{project.overview}</p>
                  </RevealFade>
                </div>
              )}
              {project.impact && (
                <div className="md:col-start-3 flex flex-col gap-2 leading-[1.2]">
                  <p className="text-[14px] text-justify tracking-[-0.02em]">
                    <RevealText delay={0.05}>Impact</RevealText>
                  </p>
                  <p className="text-[28px] md:text-[40px] tracking-[-0.02em] whitespace-pre-line">
                    <RevealText delay={0.1}>{project.impact}</RevealText>
                  </p>
                </div>
              )}
            </RevealArea>
          )}
        </div>
      </div>

      {/* The case study itself. On desktop the page snaps between it and
          the overview above. On phones the divider gets extra room either
          side, about the gap between the case study's own sections. */}
      {sections.length > 0 && (
        <div id="case-study" className="max-md:pt-6">
          <hr className="border-0 border-t border-foreground/[0.04] w-full max-md:mb-6" />
          <ProjectSections sections={sections} showSideMenu={project.showSideMenu !== false} />
          <ContentSnap contentId="case-study" overviewId="overview" />
        </div>
      )}

      {/* Next project */}
      {next && next.slug !== project.slug && (
        <RevealArea as="section" className="px-6 md:px-9 pt-24 md:pt-48">
          <Link href={`/projects/${next.slug}`} className="group inline-flex flex-col gap-2 leading-[1.2]">
            <span className="text-[14px] tracking-[-0.02em]">
              <RevealText>Next project</RevealText>
            </span>
            <span className="font-medium text-[32px] md:text-[40px] tracking-[-0.04em] group-hover:underline">
              <RevealText delay={0.06}>{next.title} →</RevealText>
            </span>
          </Link>
        </RevealArea>
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
