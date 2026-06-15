import { useSyncExternalStore } from 'react';

// Each theme has a light and a dark variant. The variant shown is decided by
// the device's prefers-color-scheme (see ThemeController) — dark variants only
// appear when the OS is in dark mode, light variants only in light mode.
export interface ThemeVariant {
  background: string;
  foreground: string;
}

export interface Theme {
  light: ThemeVariant;
  dark: ThemeVariant;
}

// Index 0 is the default black & white theme (also the CSS default in
// globals.css). The four colour themes come straight from the Figma
// "Color Themes" section. Every element in a theme is the foreground colour;
// the page sits on the background colour.
export const themes: Theme[] = [
  // 0 — black & white
  {
    light: { background: '#ffffff', foreground: '#000000' },
    dark: { background: '#111111', foreground: '#ffffff' },
  },
  // 1 — teal / olive
  {
    light: { background: '#ddf0f5', foreground: '#a3b94c' },
    dark: { background: '#0c5163', foreground: '#a3b94c' },
  },
  // 2 — blue
  {
    light: { background: '#d2e6fa', foreground: '#416bb3' },
    dark: { background: '#0e2034', foreground: '#416bb3' },
  },
  // 3 — green
  {
    light: { background: '#cdfae4', foreground: '#2baf36' },
    dark: { background: '#2a4c3b', foreground: '#2baf36' },
  },
  // 4 — red / coral
  {
    light: { background: '#fcfed2', foreground: '#e77a7a' },
    dark: { background: '#822525', foreground: '#e77a7a' },
  },
];

// The selected theme lives in a module-level variable rather than storage, so
// it survives client-side navigation (visiting /resume and clicking close)
// but resets to the default theme on a full page reload.
let themeIndex = 0;
const listeners = new Set<() => void>();

export const subscribeTheme = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getThemeIndex = () => themeIndex;

// Server (and first client) snapshot is always the default theme, matching the
// CSS so hydration is stable.
export const getServerThemeIndex = () => 0;

// Advance to the next theme, wrapping back around to the default.
export const cycleTheme = () => {
  themeIndex = (themeIndex + 1) % themes.length;
  listeners.forEach((listener) => listener());
};

export const useThemeIndex = () =>
  useSyncExternalStore(subscribeTheme, getThemeIndex, getServerThemeIndex);
