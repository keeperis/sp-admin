'use client';

import useSWR from 'swr';
import { buildApiUrl } from '@/lib/api';
import { getConfiguredSiteKey } from '@/lib/site';
import type { Locale } from '@/src/i18n';
import type { LocalizedSiteContent } from '@/src/lib/content/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SiteContentResponse = {
  version: number;
  content: LocalizedSiteContent;
};

export function useSiteContent(locale: Locale) {
  const site = getConfiguredSiteKey();
  const { data, isLoading, error, mutate } = useSWR<SiteContentResponse>(
    buildApiUrl('/api/content', { locale, site }),
    fetcher,
  );

  return {
    content: data?.content,
    version: data?.version,
    isLoading,
    error,
    mutate,
  };
}
