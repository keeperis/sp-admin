import type { ReservationBooking } from './reservations/presentation';

export type WorkshopPeriod = 'upcoming' | 'past';
export type WorkshopSummary = {
  id: string;
  startISO: string;
  titleLt: string;
  spotsLeft: number;
  spotsTotal: number;
};

const formatter = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function vilniusDateTimeKey(date: Date) {
  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}T${parts.get('hour')}:${parts.get('minute')}`;
}

export function workshopTimeKey(startISO: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(startISO)) return '';
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(startISO)) {
    const date = new Date(startISO);
    return Number.isNaN(date.getTime()) ? '' : vilniusDateTimeKey(date);
  }
  return startISO.slice(0, 16);
}

export function workshopPeriod(startISO: string, nowKey: string): WorkshopPeriod {
  const key = workshopTimeKey(startISO);
  // Invalid/undated legacy records stay reachable in upcoming rather than disappearing.
  return key && key < nowKey ? 'past' : 'upcoming';
}

export function filterWorkshops<T extends { id: string; startISO: string }>(
  workshops: T[],
  period: WorkshopPeriod,
  nowKey: string,
  workshopId = '',
) {
  return workshops
    .filter(
      (w) => workshopPeriod(w.startISO, nowKey) === period && (!workshopId || w.id === workshopId),
    )
    .sort((a, b) => {
      const left = workshopTimeKey(a.startISO);
      const right = workshopTimeKey(b.startISO);
      if (!left) return right ? 1 : a.id.localeCompare(b.id);
      if (!right) return -1;
      return (
        (period === 'past' ? right.localeCompare(left) : left.localeCompare(right)) ||
        a.id.localeCompare(b.id)
      );
    });
}

export function groupWorkshopBookings(bookings: ReservationBooking[], workshops: { id: string }[]) {
  const byWorkshop = new Map<string, ReservationBooking[]>(workshops.map((w) => [w.id, []]));
  const unassigned: ReservationBooking[] = [];
  for (const booking of bookings) {
    const group = booking.workshopId ? byWorkshop.get(booking.workshopId) : undefined;
    if (group) group.push(booking);
    else unassigned.push(booking);
  }
  return { byWorkshop, unassigned };
}

export async function fetchWorkshopBookings(
  url: string,
): Promise<{ bookings: ReservationBooking[] }> {
  const all = new Map<string, ReservationBooking>();
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const response: Response = await fetch(
      `${url}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      {
        cache: 'no-store',
      },
    );
    const page: {
      bookings: ReservationBooking[];
      nextCursor?: string | null;
      limit?: number;
      error?: string;
    } = await response.json();
    if (!response.ok || !Array.isArray(page.bookings))
      throw new Error(page.error || 'Nepavyko gauti rezervacijų');
    if (page.nextCursor === undefined && page.bookings.length >= (page.limit || 200)) {
      throw new Error(
        'Rezervacijų sąrašas nepilnas. Palaukite API atnaujinimo ir bandykite dar kartą.',
      );
    }
    for (const booking of page.bookings) all.set(booking.id, booking);
    cursor = typeof page.nextCursor === 'string' ? page.nextCursor : null;
    if (cursor) {
      if (seen.has(cursor))
        throw new Error('Nepavyko įkelti visų rezervacijų. Bandykite dar kartą.');
      seen.add(cursor);
    }
  } while (cursor);
  return { bookings: [...all.values()] };
}

export function legacyWorkshopUrl(params: Record<string, string | string[] | undefined>) {
  const next = new URLSearchParams();
  for (const key of ['site', 'status', 'workshopId', 'period']) {
    if (typeof params[key] === 'string' && params[key]) next.set(key, params[key]);
  }
  return `/admin/workshops${next.size ? `?${next}` : ''}`;
}
