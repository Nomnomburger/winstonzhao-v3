'use client';

import Link from 'next/link';
import HeaderMenu from '@/components/HeaderMenu';
import { EMAIL, RESUME_URL } from '@/lib/site';

const LINKS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'contact', label: 'Contact', href: `mailto:${EMAIL}` },
  { id: 'resume', label: 'Resume', href: RESUME_URL },
];

export default function ProjectHeader() {
  return (
    <header className="relative z-30 flex w-full items-center justify-between p-6 md:p-9">
      <Link href="/" className="font-medium text-[14px] tracking-[-0.28px] leading-[1.2] whitespace-nowrap">
        Winston Zhao
      </Link>

      <HeaderMenu
        links={LINKS}
        className="font-normal text-[14px] tracking-[-0.28px] leading-[1.2]"
      />
    </header>
  );
}
