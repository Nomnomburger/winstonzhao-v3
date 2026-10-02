'use client';

import { useSyncExternalStore } from 'react';
import type { Language } from '@/components/panels/translations';

// The selected language survives navigation away and back; the
// sessionStorage copy additionally survives full reloads within the tab.
// Implemented as a tiny external store so components can subscribe via
// useSyncExternalStore (hydration-safe: the server snapshot is always 'en'
// and React re-renders with the restored language after hydration).
const LANGUAGE_STORAGE_KEY = 'language';

const isLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'sv' || value === 'zh';

let savedLanguage: Language = 'en';
let restoredFromSession = false;
const languageListeners = new Set<() => void>();

const subscribeToLanguage = (listener: () => void) => {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
};

const getLanguage = (): Language => {
  if (!restoredFromSession) {
    restoredFromSession = true;
    try {
      const stored = sessionStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(stored)) savedLanguage = stored;
    } catch {
      // sessionStorage unavailable (e.g. blocked) — keep the default
    }
  }
  return savedLanguage;
};

const getServerLanguage = (): Language => 'en';

const setLanguage = (lang: Language) => {
  savedLanguage = lang;
  try {
    sessionStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // sessionStorage unavailable — the module variable still covers
    // client-side navigation
  }
  languageListeners.forEach((listener) => listener());
};

export function useLanguage() {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage, getServerLanguage);
  return { language, setLanguage };
}
