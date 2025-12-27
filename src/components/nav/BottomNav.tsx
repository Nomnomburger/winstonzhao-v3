'use client';

type RouteName = 'home' | 'projects' | 'playground' | 'about' | 'contact';

interface BottomNavProps {
  activeRoute: RouteName;
  onNavigate: (route: RouteName) => void;
}

const NAV_ITEMS: { route: RouteName; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'projects', label: 'Projects' },
  { route: 'playground', label: 'Playground' },
  { route: 'about', label: 'About' },
  { route: 'contact', label: 'Contact' },
];

export default function BottomNav({ activeRoute, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-8 border-t border-zinc-200 bg-white/80 backdrop-blur-sm px-6 py-4 dark:border-zinc-800 dark:bg-black/80"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.route;
        return (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? 'text-black dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

