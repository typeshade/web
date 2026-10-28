// The locales alone, with nothing imported, for code that runs outside the build and must not
// pull the dictionaries in with them: the Worker and the example data (src/lib/example-data.ts).
export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];
