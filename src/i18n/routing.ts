import { defineRouting } from "next-intl/routing";

/**
 * Portuguese is the default because MinesMoz is a Mozambique-first platform.
 * English is a first-class second locale rather than a bolt-on: every route
 * lives under a locale segment from the start, so adding a third language is a
 * message file and one array entry, not a refactor.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
});

export type Locale = (typeof routing.locales)[number];
