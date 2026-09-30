import { redirect } from 'next/navigation';
import { legacyWorkshopUrl } from '@/lib/workshop-reservations';

export default async function LegacyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyWorkshopUrl(await searchParams));
}
