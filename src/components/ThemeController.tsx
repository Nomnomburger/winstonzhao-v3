'use client';

import { useEffect } from 'react';
import { themes, useThemeIndex } from './theme';

// Applies the selected theme by writing --background / --foreground onto the
// document root. The default theme (index 0) clears the overrides so the CSS
// in globals.css drives it instead — including its own prefers-color-scheme
// dark variant. For the colour themes the matching light/dark variant is
// chosen from the device's prefers-color-scheme and kept in sync if the OS
// theme changes. Mounted once in the root layout, so it persists across
// client-side navigation between / and /resume.
export default function ThemeController() {
  const index = useThemeIndex();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      if (index === 0) {
        root.style.removeProperty('--background');
        root.style.removeProperty('--foreground');
        return;
      }
      const variant = media.matches ? themes[index].dark : themes[index].light;
      root.style.setProperty('--background', variant.background);
      root.style.setProperty('--foreground', variant.foreground);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [index]);

  return null;
}
