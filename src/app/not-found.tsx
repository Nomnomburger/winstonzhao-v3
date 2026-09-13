import Link from 'next/link';
import ProjectHeader from '@/components/project/ProjectHeader';

export default function NotFound() {
  return (
    <main className="h-screen w-full overflow-y-auto bg-white dark:bg-[#1E1E1E] text-[#1E1E1E] dark:text-white">
      <ProjectHeader />
      <div className="flex flex-col gap-3 items-start px-9 pt-24">
        <p className="text-[40px] font-medium leading-[normal] tracking-[-1.6px]">Page not found</p>
        <Link
          href="/"
          className="text-[14px] leading-[normal] tracking-[-0.28px] underline hover:opacity-70 transition-opacity"
        >
          Back to start
        </Link>
      </div>
    </main>
  );
}
