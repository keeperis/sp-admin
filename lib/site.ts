export const SITE_KEYS = ['landing', 'ceramics', 'yoga'] as const;

export type SiteKey = (typeof SITE_KEYS)[number];

export const DEFAULT_SITE: SiteKey = 'ceramics';

export function normalizeSiteKey(value: string | null | undefined): SiteKey {
  if (value === 'landing' || value === 'ceramics' || value === 'yoga') {
    return value;
  }
  return DEFAULT_SITE;
}

export function getConfiguredSiteKey(): SiteKey {
  return normalizeSiteKey(process.env.NEXT_PUBLIC_SITE_KEY || process.env.SITE_KEY);
}
