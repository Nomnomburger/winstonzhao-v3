import { PortableText, type PortableTextComponents } from 'next-sanity';
import type { BodyBlock, ProjectSection, TextBlock } from '@/lib/projects';
import { GalleryFigure, ImageFigure, VideoFigure } from './Media';
import SectionNav from './SectionNav';

export const sectionId = (title: string, index: number) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  }-${index + 1}`;

const textComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h3: ({ children }) => (
      <h3 className="pt-4 font-medium text-[18px] md:text-[20px] tracking-[-0.02em]">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l border-foreground pl-4 text-[20px] md:text-[24px] tracking-[-0.02em]">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc ps-6">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal ps-6">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = (value as { href?: string } | undefined)?.href ?? '#';
      const external = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          className="underline"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      );
    },
  },
};

type Chunk = { kind: 'text'; blocks: TextBlock[] } | { kind: 'media'; block: Exclude<BodyBlock, TextBlock> };

// Consecutive text blocks render together (so lists group correctly); media
// blocks stand on their own so they can take their own width.
function chunk(content: BodyBlock[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const block of content) {
    if (block._type === 'block') {
      const last = chunks[chunks.length - 1];
      if (last?.kind === 'text') last.blocks.push(block);
      else chunks.push({ kind: 'text', blocks: [block] });
    } else {
      chunks.push({ kind: 'media', block });
    }
  }
  return chunks;
}

interface ProjectSectionsProps {
  sections: ProjectSection[];
  showSideMenu: boolean;
}

// The case study body. With the side menu on, the section names sit in the
// first column (sticky) and the sections fill columns 2–3. With it off, the
// text still sits in columns 2–3 but full-width media spans the whole page.
export default function ProjectSections({ sections, showSideMenu }: ProjectSectionsProps) {
  if (sections.length === 0) return null;

  // Text column: columns 2–3, keeping 128px clear on the right on desktop.
  const textColumn = showSideMenu
    ? 'lg:pr-32'
    : 'md:ml-auto md:w-[calc((200%-16px)/3)] lg:pr-32';
  const fullSizes = showSideMenu ? '(min-width: 768px) 66vw, 100vw' : '100vw';
  const contentSizes = '(min-width: 768px) 55vw, 100vw';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 p-6 md:p-9">
      {showSideMenu && (
        <aside className="hidden md:block">
          <SectionNav
            items={sections.map((s, i) => ({ id: sectionId(s.title, i), title: s.title }))}
          />
        </aside>
      )}

      <div className={`flex flex-col gap-24 md:gap-36 ${showSideMenu ? 'md:col-span-2' : 'md:col-span-3'}`}>
        {sections.map((section, i) => {
          const chunks = chunk(section.content ?? []);
          return (
            // Text follows the section title 12px down (as in Figma); media
            // gets 36px around it.
            <section
              key={section._key}
              id={sectionId(section.title, i)}
              tabIndex={-1}
              className="flex flex-col gap-3 scroll-mt-[104px] focus:outline-none"
            >
              <div className={`flex flex-col gap-3 ${textColumn}`}>
                <p className="text-[12px] md:text-[14px] text-justify leading-[1.2]">{section.title}</p>
                {section.heading && (
                  <h2 className="text-[28px] md:text-[40px] tracking-[-0.02em] leading-[1.2] whitespace-pre-line">
                    {section.heading}
                  </h2>
                )}
              </div>

              {chunks.map((c, j) => {
                const spaced = c.kind === 'media' || chunks[j - 1]?.kind === 'media' ? 'mt-6' : '';
                return c.kind === 'text' ? (
                  <div
                    key={j}
                    className={`flex flex-col gap-[1.2em] font-[450] text-[15px] md:text-[16px] leading-[1.2] ${spaced} ${textColumn}`}
                  >
                    <PortableText value={c.blocks} components={textComponents} />
                  </div>
                ) : (
                  <div
                    key={c.block._key}
                    className={`${spaced} ${
                      c.block._type !== 'mediaGallery' && c.block.size === 'content' ? textColumn : 'w-full'
                    }`}
                  >
                    {c.block._type === 'mediaImage' && (
                      <ImageFigure
                        image={c.block}
                        caption={c.block.caption}
                        sizes={c.block.size === 'content' ? contentSizes : fullSizes}
                      />
                    )}
                    {c.block._type === 'mediaVideo' && <VideoFigure video={c.block} />}
                    {c.block._type === 'mediaGallery' && (
                      <GalleryFigure images={c.block.images ?? []} caption={c.block.caption} />
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
