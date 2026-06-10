export type Language = 'en' | 'sv';

export const translations = {
  en: {
    sayHi: 'say hi',
    bioLines: [
      'product designer',
      'blending form and function',
      'currently in stockholm',
      'building at newly',
    ],
    designAt: 'Design at',
    campusLeaderAt: 'Campus Leader at',
    prevDesignAt: 'Prev. Design at',
    newPortfolio: 'I’m in the process of creating a new portfolio.',
    checkBackPrefix: 'Check back soon, or ',
    oldSiteLink: 'visit the old site',
    resume: 'resume',
  },
  sv: {
    sayHi: 'säg hej',
    bioLines: [
      'produktdesigner',
      'förenar form och funktion',
      'just nu i stockholm',
      'bygger på newly',
    ],
    designAt: 'Design på',
    campusLeaderAt: 'Campus Leader på',
    prevDesignAt: 'Tid. Design på',
    newPortfolio: 'Ny portfolio är på gång.',
    checkBackPrefix: 'Kika in igen snart, eller ',
    oldSiteLink: 'besök den gamla sajten',
    resume: 'CV (EN)',
  },
} as const satisfies Record<Language, unknown>;
