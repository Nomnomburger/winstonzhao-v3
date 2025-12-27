'use client';

import { useRouter } from 'next/navigation';

export default function HomePanel() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col px-8 py-16 md:px-16 md:py-24 bg-white dark:bg-black">
      <main className="flex flex-col gap-16 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="flex flex-col gap-6">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-black dark:text-white leading-none">
            Winston Zhao
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Product designer blending form and function to create meaningful digital experiences.
          </p>
        </div>

        {/* Projects Link Section */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="group flex items-center gap-4 text-left p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-950"
          >
            <div className="flex flex-col gap-2 flex-1">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Projects
              </span>
              <span className="text-2xl md:text-3xl font-semibold text-black dark:text-white">
                View my work
              </span>
            </div>
            <svg
              className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}

