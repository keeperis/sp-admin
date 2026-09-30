import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReservationBooking } from './reservations/presentation';
import {
  fetchWorkshopBookings,
  filterWorkshops,
  groupWorkshopBookings,
  legacyWorkshopUrl,
  vilniusDateTimeKey,
  workshopPeriod,
  workshopTimeKey,
} from './workshop-reservations';

test('Vilnius time is independent of device timezone and handles summer/winter offsets', () => {
  assert.equal(vilniusDateTimeKey(new Date('2026-09-30T09:55:00Z')), '2026-09-30T12:55');
  assert.equal(vilniusDateTimeKey(new Date('2026-12-30T09:55:00Z')), '2026-12-30T11:55');
  assert.equal(workshopTimeKey('2026-09-30T09:55:00Z'), '2026-09-30T12:55');
  assert.equal(workshopTimeKey('2026-09-30T12:55:00+03:00'), '2026-09-30T12:55');
  assert.equal(workshopTimeKey('2026-09-30T12:55'), '2026-09-30T12:55');
});

test('period uses workshop start, not registration date; exact minute is upcoming', () => {
  const now = '2026-09-30T12:55';
  assert.equal(workshopPeriod('2026-09-30T12:54', now), 'past');
  assert.equal(workshopPeriod('2026-09-30T12:55', now), 'upcoming');
  assert.equal(workshopPeriod('2026-10-01T00:00', now), 'upcoming');
  assert.equal(workshopPeriod('', now), 'upcoming');
});

test('upcoming nearest first, past most recent first; legacy id remains selectable', () => {
  const items = [
    { id: 'c', startISO: '2026-10-02T10:00' },
    { id: 'b', startISO: '2026-10-01T10:00' },
    { id: 'p', startISO: '2026-09-29T18:00' },
    { id: 'q', startISO: '2026-09-28T18:00' },
  ];
  const now = '2026-09-30T12:00';
  assert.deepEqual(
    filterWorkshops(items, 'upcoming', now).map((w) => w.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    filterWorkshops(items, 'past', now).map((w) => w.id),
    ['p', 'q'],
  );
  assert.deepEqual(
    filterWorkshops(items, 'past', now, 'q').map((w) => w.id),
    ['q'],
  );
});

test('grouping attaches only matching reservations and preserves orphans and empty workshops', () => {
  const bookings = [
    { id: '1', workshopId: 'w' },
    { id: '2', workshopId: 'deleted', workshop: null },
    { id: '3', workshopId: 'w' },
  ] as ReservationBooking[];
  const grouped = groupWorkshopBookings(bookings, [{ id: 'w' }, { id: 'empty' }]);
  assert.deepEqual(
    grouped.byWorkshop.get('w')?.map((b) => b.id),
    ['1', '3'],
  );
  assert.deepEqual(grouped.byWorkshop.get('empty'), []);
  assert.deepEqual(
    grouped.unassigned.map((b) => b.id),
    ['2'],
  );
});

test('old booking and reservation URLs retain supported filters only', () => {
  assert.equal(
    legacyWorkshopUrl({
      site: 'yoga',
      status: 'confirmed',
      workshopId: 'old',
      period: 'past',
      redirect: 'https://example.com',
    }),
    '/admin/workshops?site=yoga&status=confirmed&workshopId=old&period=past',
  );
  assert.equal(legacyWorkshopUrl({ site: ['yoga', 'ceramics'] }), '/admin/workshops');
});

test('fetches every page, keeps site and includes bookings older than first 200', async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    return Response.json(
      calls.length === 1
        ? {
            bookings: Array.from({ length: 200 }, (_, id) => ({ id: String(id) })),
            nextCursor: 'next,cursor',
            limit: 200,
          }
        : { bookings: [{ id: 'historical' }], nextCursor: null, limit: 200 },
    );
  });
  const result = await fetchWorkshopBookings('/api/admin/bookings?site=yoga');
  assert.equal(result.bookings.length, 201);
  assert.equal(result.bookings[200].id, 'historical');
  assert.equal(calls[1], '/api/admin/bookings?site=yoga&cursor=next%2Ccursor');
});

test('never presents partial results as a complete list when subsequent page fails', async (t) => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async () =>
    ++count === 1
      ? Response.json({ bookings: [{ id: 'a' }], nextCursor: 'b' })
      : Response.json({ error: 'Klaida' }, { status: 500 }),
  );
  await assert.rejects(fetchWorkshopBookings('/api/admin/bookings?site=ceramics'), /Klaida/);
});

test('detects repeated cursors and old API truncation rather than silently dropping data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ bookings: [], nextCursor: 'same' }),
  );
  await assert.rejects(fetchWorkshopBookings('/api/admin/bookings?site=ceramics'), /visų/);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ bookings: Array.from({ length: 200 }, (_, id) => ({ id })), limit: 200 }),
  );
  await assert.rejects(fetchWorkshopBookings('/api/admin/bookings?site=ceramics'), /nepilnas/);
});
