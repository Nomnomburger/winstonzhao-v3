import Image from 'next/image';
import { PortableText, type PortableTextBlock, type PortableTextComponents } from 'next-sanity';
import { urlFor } from '../../../sanity/lib/image';
import type { ProjectDetail, ProjectSection } from '../../../sanity/lib/projects';
import { TAG_LABELS } from '@/lib/site';
import ProjectHeader from './ProjectHeader';

interface ProjectPageProps {
  project: ProjectDetail;
}

/** Shape of an image block inside a section body, as expanded by the GROQ query. */
interface BodyImage {
  _type: 'image';
  alt?: string;
  caption?: string;
  asset?: {
    _id: string;
    url?: string;
    metadata?: {
      dimensions?: { width: number; height: number; aspectRatio: number };
      lqip?: string;
    };
  };
}

const labelClass = 'text-[14px] leading-[normal] tracking-[-0.28px] text-justify';

function sectionId(section: ProjectSection): string {
  const fromTitle = section.title
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return fromTitle || section._key;
}

/** Editors leave empty paragraphs for spacing; keep their height instead of collapsing them. */
function isEmptyBlock(value: PortableTextBlock): boolean {
  const children = (value.children ?? []) as Array<{ text?: string }>;
  return !children.some((child) => child.text?.trim());
}

function BodyImageBlock({ value }: { value: BodyImage }) {
  if (!value.asset) return null;
  const dimensions = value.asset.metadata?.dimensions;
  const width = dimensions?.width ?? 1600;
  const height = dimensions?.height ?? 1200;
  const lqip = value.asset.metadata?.lqip;

  return (
    <figure className="my-6 w-full">
      <Image
        src={urlFor(value).width(1600).auto('format').url()}
        alt={value.alt ?? ''}
        width={width}
        height={height}
        sizes="(min-width: 1280px) 672px, 100vw"
        className="h-auto w-full"
        placeholder={lqip ? 'blur' : 'empty'}
        blurDataURL={lqip}
      />
      {value.caption && (
        <figcaption className="mt-2 text-[12px] leading-[normal] tracking-[-0.24px] opacity-70">
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
}

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children, value }) => (
      <p className="mb-0">{isEmptyBlock(value) ? ' ' : children}</p>
    ),
    h2: ({ children }) => (
      <h3 className="mt-6 mb-3 text-[32px] font-[450] leading-[normal] tracking-[-0.64px]">
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="mt-4 mb-2 text-[20px] font-medium leading-[normal] tracking-[-0.4px]">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l border-current/30 pl-4">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="mb-0 ms-6">{children}</li>,
    number: ({ children }) => <li className="mb-0 ms-6">{children}</li>,
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} target="_blank" rel="noreferrer" className="underline">
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }: { value: BodyImage }) => <BodyImageBlock value={value} />,
  },
};

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 items-end w-full">
      <p className={`${labelClass} w-full`}>{label}</p>
      <div className="w-full text-[14px] leading-[normal] text-justify">{children}</div>
    </div>
  );
}

export default function ProjectPage({ project }: ProjectPageProps) {
  const tagLabel = project.tags?.map((tag) => TAG_LABELS[tag] ?? tag).join(', ');
  const heroUrl = project.coverImage
    ? urlFor(project.coverImage).width(2416).height(1812).fit('crop').auto('format').url()
    : null;
  const sections = project.sections ?? [];
  const hasDetails = Boolean(project.role || project.timeline || project.skills?.length);

  return (
    <main className="min-h-screen w-full bg-white dark:bg-[#1E1E1E] text-[#1E1E1E] dark:text-white">
      <div className="flex flex-col items-start w-full pb-24">
        <ProjectHeader />

        {/* Title + intro */}
        <section className="grid grid-cols-3 gap-x-6 px-9 pt-24 pb-9 w-full">
          <div className="col-start-1 self-end flex items-start">
            <h1 className="text-[40px] font-medium leading-[normal] tracking-[-1.6px] whitespace-nowrap">
              {project.title}
            </h1>
          </div>
          {project.description && (
            <div className="col-start-3 self-start flex items-start justify-end">
              <p className="flex-1 min-w-px text-[14px] leading-[normal] text-justify">
                {project.description}
              </p>
            </div>
          )}
        </section>

        {/* Meta row */}
        <section className="grid grid-cols-3 gap-x-6 px-9 w-full text-[14px] leading-[normal] tracking-[-0.28px]">
          <p className="col-start-1 justify-self-start text-justify whitespace-nowrap">
            {project.client}
          </p>
          <p className="col-start-2 justify-self-start text-justify whitespace-nowrap">
            {tagLabel}
          </p>
          <div className="col-start-3 flex items-center justify-between">
            <p className="text-justify whitespace-nowrap">{project.year}</p>
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="text-right whitespace-nowrap hover:opacity-70 transition-opacity"
              >
                Visit ↗
              </a>
            )}
          </div>
        </section>

        {/* Hero image */}
        <section className="flex flex-col items-start p-9 w-full">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {heroUrl && (
              <Image
                src={heroUrl}
                alt={project.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            )}
          </div>
        </section>

        {/* Statement + role / timeline / skills */}
        {(project.statement || hasDetails) && (
          <section className="grid grid-cols-3 gap-x-6 px-9 pb-9 w-full">
            {project.statement && (
              <div className="col-start-1 col-end-3 flex items-start pr-64">
                <p className="flex-1 min-w-px text-[40px] leading-[normal] tracking-[-0.8px]">
                  {project.statement}
                </p>
              </div>
            )}
            {hasDetails && (
              <div className="col-start-3 flex flex-col gap-6 items-start">
                {project.role && (
                  <DetailItem label="Role">
                    <p>{project.role}</p>
                  </DetailItem>
                )}
                {project.timeline && (
                  <DetailItem label="Timeline">
                    <p>{project.timeline}</p>
                  </DetailItem>
                )}
                {project.skills && project.skills.length > 0 && (
                  <DetailItem label="Skills & Tools">
                    {project.skills.map((skill) => (
                      <p key={skill} className="mb-0">
                        {skill}
                      </p>
                    ))}
                  </DetailItem>
                )}
              </div>
            )}
          </section>
        )}

        {/* Overview + impact */}
        {(project.overview || project.impact) && (
          <section className="grid grid-cols-3 gap-x-6 p-9 w-full">
            {project.overview && (
              <div className="col-start-1 flex flex-col gap-2 items-end">
                <p className={`${labelClass} w-full`}>Overview</p>
                <p className="w-full text-[14px] leading-[normal] text-justify whitespace-pre-line">
                  {project.overview}
                </p>
              </div>
            )}
            {project.impact && (
              <div className="col-start-3 flex flex-col gap-2 items-start">
                <p className={`${labelClass} w-full`}>Impact</p>
                <p className="w-full text-[40px] leading-[normal] tracking-[-0.8px]">
                  {project.impact}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Case study sections with side navigation */}
        {sections.length > 0 && (
          <>
            <hr className="w-full border-0 border-t border-[#F6F6F6] dark:border-white/10" />
            <section className="grid grid-cols-3 gap-x-4 p-9 w-full">
              <nav
                className="col-start-1 self-start sticky top-9 flex flex-col gap-3 text-[14px] font-[450] leading-[normal] text-justify"
                aria-label="Case study sections"
              >
                {sections.map((section) => (
                  <a
                    key={section._key}
                    href={`#${sectionId(section)}`}
                    className="w-full hover:opacity-70 transition-opacity"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="col-start-2 col-end-4 flex flex-col gap-24 pr-32">
                {sections.map((section) => (
                  <article
                    key={section._key}
                    id={sectionId(section)}
                    className="flex flex-col gap-3 items-start scroll-mt-9"
                  >
                    <p className="w-full text-[14px] leading-[normal] text-justify">{section.title}</p>
                    {section.heading && (
                      <h2 className="w-full text-[32px] font-[450] leading-[normal] tracking-[-0.64px]">
                        {section.heading}
                      </h2>
                    )}
                    {section.body && section.body.length > 0 && (
                      <div className="w-full text-[16px] font-[450] leading-[normal]">
                        <PortableText value={section.body} components={portableTextComponents} />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
