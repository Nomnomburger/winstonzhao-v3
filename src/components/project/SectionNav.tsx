'use client';

import { useEffect, useState } from 'react';
import { getSmoothScroll } from '@/lib/smooth-scroll';

interface SectionNavProps {
  items: { id: string; title: string }[];
}

// Sticky list of section names. The section at the middle of the screen is
// highlighted; the rest are dimmed.
export default function SectionNav({ items }: SectionNavProps) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    // The active section is the last one whose top has passed the middle of
    // the screen. At the bottom of the page it's the last section, which may
    // be too short to ever reach the middle.
    const update = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = items[0]?.id;
      for (const { id } of items) {
        const el = document.getElementById(id);
        if (el && (atBottom || el.getBoundingClientRect().top <= window.innerHeight / 2)) current = id;
      }
      setActive(current);
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-9 flex flex-col gap-3 items-start font-[450] text-[14px] leading-[1.2]"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? 'location' : undefined}
          onClick={(e) => {
            const section = document.getElementById(item.id);
            if (!section) return;
            e.preventDefault();
            const smoothScroll = getSmoothScroll();
            if (smoothScroll) smoothScroll.scrollTo(section);
            else section.scrollIntoView({ behavior: 'smooth' });
            // Keyboard focus follows, so Tab continues inside the section
            section.focus({ preventScroll: true });
            history.replaceState(null, '', `#${item.id}`);
          }}
          className={`transition-opacity duration-300 hover:opacity-100 ${
            active === item.id ? 'opacity-100' : 'opacity-40'
          }`}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
