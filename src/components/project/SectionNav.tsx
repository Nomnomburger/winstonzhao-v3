'use client';

import { useEffect, useState } from 'react';

interface SectionNavProps {
  items: { id: string; title: string }[];
}

// Sticky list of section names. The section in the middle of the screen is
// highlighted; the rest are dimmed.
export default function SectionNav({ items }: SectionNavProps) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-9 flex flex-col gap-3 items-start font-[450] text-[14px] leading-[1.2]">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
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
