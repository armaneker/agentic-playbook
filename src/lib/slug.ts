/**
 * Convert a pathname like /openclaw/architecture/ to a slug like openclaw-architecture
 */
export function pathnameToSlug(pathname: string): string {
  return pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '-');
}
