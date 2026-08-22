/**
 * Where the public website lives.
 *
 * The client hasn't bought a domain yet, so this falls back to the local dev
 * server. Once the domain is live, set VITE_PUBLIC_SITE_URL in the environment
 * (e.g. https://deepthiconstruction.com) and every shared case-study link
 * updates with it — no code change needed.
 */
export const PUBLIC_SITE_URL: string =
  import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3000';

export const caseStudyUrl = (slug: string) => `${PUBLIC_SITE_URL}/projects/${slug}`;
