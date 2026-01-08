'use client';

import { useState, useEffect, useRef } from 'react';
import { urlFor } from '../../../sanity/lib/image';
import Image from 'next/image';

interface Project {
  _id: string;
  title: string;
  year: number;
  description: string;
  coverImage: any;
  tags?: string[];
  slug: {
    current: string;
  };
}

type FilterType = 'all' | 'uiux' | 'branding' | 'awards';

export default function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const imageListRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true;
    return project.tags?.some((tag) => {
      if (filter === 'uiux') return tag === 'uiux';
      if (filter === 'branding') return tag === 'branding';
      if (filter === 'awards') return tag === 'awards';
      return false;
    });
  });

  // Get the middle index (higher one if even number of items)
  const getMiddleIndex = (length: number) => {
    if (length === 0) return 0;
    return Math.floor((length - 1) / 2);
  };

  // Scroll to target image (hovered or middle)
  useEffect(() => {
    const scrollToImage = (index: number) => {
      if (imageListRef.current) {
        const container = imageListRef.current;
        const containerHeight = container.clientHeight;
        // Layout is constant - no margins change, only transforms
        const baseHeight = 149;
        const marginY = 18;
        const paddingTop = window.innerHeight / 2 - 74.5;
        const imageTop = paddingTop + marginY + index * (baseHeight + marginY * 2);
        const scrollTarget = imageTop - (containerHeight / 2) + (baseHeight / 2);
        
        container.scrollTo({
          top: scrollTarget,
          behavior: 'smooth',
        });
      }
    };

    if (hoveredIndex !== null) {
      scrollToImage(hoveredIndex);
    } else {
      // Small delay to let transform transition complete
      const timer = setTimeout(() => {
        scrollToImage(getMiddleIndex(filteredProjects.length));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [hoveredIndex, filteredProjects.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col px-6 py-6 bg-white dark:bg-[#1E1E1E]">
        <div className="flex items-center justify-center h-full">
          <p className="text-[16px] text-[#1E1E1E] dark:text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col px-6 py-6 bg-white dark:bg-[#1E1E1E]">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-[16px] text-[#1E1E1E] dark:text-white">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetch('/api/projects')
                .then((res) => res.json())
                .then((data) => {
                  setProjects(data);
                  setLoading(false);
                })
                .catch((err) => {
                  console.error('Error fetching projects:', err);
                  setError('Failed to load projects. Please try again later.');
                  setLoading(false);
                });
            }}
            className="px-4 py-2 text-[16px] text-[#1E1E1E] dark:text-white border border-[#1E1E1E] dark:border-white rounded hover:opacity-70 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1E1E] relative h-screen w-full overflow-hidden">
      {/* Header - Absolute positioned */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-6 z-10">
        <p className="text-[64px] leading-none tracking-[-3.2px] text-[#1E1E1E] dark:text-white font-medium">
          projects
        </p>
        <div className="leading-none text-[12px] text-right text-[#1E1E1E] dark:text-white cursor-pointer">
          <button
            onClick={() => setFilter('all')}
            className={`mb-0 block ${filter === 'all' ? 'font-medium' : 'font-normal'} hover:opacity-70 transition-opacity`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('uiux')}
            className={`mb-0 block ${filter === 'uiux' ? 'font-medium' : 'font-normal'} hover:opacity-70 transition-opacity`}
          >
            UI/UX
          </button>
          <button
            onClick={() => setFilter('branding')}
            className={`mb-0 block ${filter === 'branding' ? 'font-medium' : 'font-normal'} hover:opacity-70 transition-opacity`}
          >
            BRANDING
          </button>
          <button
            onClick={() => setFilter('awards')}
            className={`block ${filter === 'awards' ? 'font-medium' : 'font-normal'} hover:opacity-70 transition-opacity`}
          >
            AWARDS
          </button>
        </div>
      </div>

      {/* Gallery - Full height layout */}
      <div className="flex gap-24 items-center h-full w-full px-6">
        {/* Project List - Left Column (vertically centered) */}
        <div className="basis-0 flex flex-col grow items-center justify-center min-w-px shrink-0">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project, index) => (
              <div
                key={project._id}
                className="flex font-normal items-start justify-between leading-normal text-[16px] text-[#1E1E1E] dark:text-white w-full cursor-pointer transition-opacity hover:opacity-70 py-1"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <p className="basis-0 grow min-h-px min-w-px shrink-0">{project.title}</p>
                <p className="shrink-0 text-nowrap text-right">{project.year}</p>
              </div>
            ))
          ) : (
            <p className="text-[16px] text-[#1E1E1E] dark:text-white">No projects found</p>
          )}
        </div>

        {/* Image List - Middle Column (Full viewport height, fixed width wrapper) */}
        <div className="relative shrink-0 w-[266px] h-screen">
          <div 
            ref={imageListRef}
            className="absolute inset-0 flex flex-col items-center overflow-y-auto scrollbar-hide"
            style={{ 
              paddingTop: 'calc(50vh - 74.5px)',
              paddingBottom: 'calc(50vh - 74.5px)',
              scrollBehavior: 'smooth',
            }}
          >
            {filteredProjects.map((project, index) => {
              const imageUrl = project.coverImage
                ? urlFor(project.coverImage).width(400).height(300).url()
                : null;
              const isHovered = hoveredIndex === index;
              // Scale factors: 266/200 ≈ 1.33, 200/149 ≈ 1.342
              const scaleX = 266 / 200;
              const scaleY = 200 / 149;
              // Visual height extension when scaled: (200 - 149) / 2 = 25.5px each side
              const visualExtension = 25.5;
              
              // Use pure transforms - no layout changes
              // Images above hovered: move up; Images below hovered: move down
              let transform = 'scale(1) translateY(0)';
              if (isHovered) {
                transform = `scale(${scaleX}, ${scaleY})`;
              } else if (hoveredIndex !== null) {
                if (index < hoveredIndex) {
                  // Above hovered - move up
                  transform = `translateY(-${visualExtension}px)`;
                } else {
                  // Below hovered - move down
                  transform = `translateY(${visualExtension}px)`;
                }
              }

              return (
                <div
                  key={project._id}
                  ref={(el) => { imageRefs.current[index] = el; }}
                  className="relative shrink-0 my-[18px]"
                  style={{
                    width: '200px',
                    height: '149px',
                    transform,
                    zIndex: isHovered ? 10 : 1,
                    transition: 'transform 450ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  ) : (
                    <div className="absolute bg-zinc-200 dark:bg-zinc-700 inset-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Description List - Right Column (vertically centered) */}
        <div className="basis-0 flex flex-col grow items-center justify-center min-w-px shrink-0">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project, index) => (
              <div
                key={project._id}
                className="flex font-normal items-start justify-between leading-normal text-[16px] text-[#1E1E1E] dark:text-white w-full cursor-pointer transition-opacity hover:opacity-70 py-1"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <p className="basis-0 grow min-h-px min-w-px shrink-0">
                  {project.description || 'Description'}
                </p>
                <a
                  href={`/projects/${project.slug?.current || project._id}`}
                  className="shrink-0 text-nowrap text-right hover:underline cursor-pointer"
                >
                  Learn More ↗
                </a>
              </div>
            ))
          ) : (
            <p className="text-[16px] text-[#1E1E1E] dark:text-white">No projects found</p>
          )}
        </div>
      </div>
    </div>
  );
}

