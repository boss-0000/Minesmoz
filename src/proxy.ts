import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/**
 * Locale routing only.
 *
 * Authentication and authorization are deliberately NOT handled here. Middleware
 * cannot know which row a request concerns, so it can only guard path prefixes,
 * and prefix guards have a poor security record in Next.js (CVE-2025-29927 let a
 * crafted header skip middleware entirely). Every protected read and write in
 * this application is instead scoped by actor at the point the query is built —
 * see src/lib/authz.ts and src/lib/repositories/. Removing this file would cost
 * the locale prefixes and nothing else.
 */
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
