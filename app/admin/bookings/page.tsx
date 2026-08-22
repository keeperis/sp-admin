import { redirect } from 'next/navigation';

export default async function LegacyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const legacyParams = await searchParams;
  const nextParams = new URLSearchParams();
  for (const key of ['site', 'status', 'workshopId']) {
    const value = legacyParams[key];
    if (typeof value === 'string' && value) nextParams.set(key, value);
  }

  const query = nextParams.toString();
  redirect(`/admin/reservations${query ? `?${query}` : ''}`);
}
